-- =====================================================================
-- LIBRO v4: reservas mais completas e moderação de avaliações.
--
--   * prazo para retirar um livro reservado passa de 48 horas para 3 dias
--   * corrige o "beco sem saída": quando o exemplar livre estava guardado
--     para outra pessoa, não dava para pegar nem para reservar
--   * sempre que sobra exemplar (devolução, reserva vencida ou cancelada,
--     exemplar novo), o próximo da fila é chamado e fica marcado para
--     receber e-mail, enviado quando a biblioteca abre o site
--   * reservar devolve a posição na fila (para o e-mail de confirmação)
--   * a ficha do livro e o catálogo mostram exemplares guardados e a fila
--   * a biblioteca pode remover avaliações ofensivas (fica registrado no log)
--
-- COMO INSTALAR: Supabase > SQL Editor > + > cole este arquivo > Run.
-- Precisa da v2 instalada. Roda numa transação: se der erro, nada muda.
-- Para voltar atrás: supabase/desfazer-v4.sql
-- =====================================================================

begin;

-- reserva que virou "disponível" pela arrumação automática e ainda não teve e-mail enviado
alter table reservas add column if not exists aviso_pendente boolean not null default false;


-- Arrumação automática (substitui a da v2)
create or replace function public.libro_manutencao()
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
    liv livros;
    livres int;
    proxima reservas;
begin
    update suspensoes set status = 'cumprida'
        where status = 'ativa' and data_fim < libro_hoje();

    -- reservas de quem já pegou o livro foram atendidas
    update reservas res set status = 'concluida', aviso_pendente = false
        where res.status in ('ativa', 'disponivel')
        and exists (
            select 1 from emprestimos e
            where e.usuario_id = res.usuario_id
            and e.livro_id = res.livro_id
            and e.data_emprestimo >= res.data_reserva
        );

    update reservas set data_disponivel = now()
        where status = 'disponivel' and data_disponivel is null;

    -- reservas não retiradas em 3 dias expiram
    update reservas set status = 'expirada', aviso_pendente = false
        where status = 'disponivel' and data_disponivel < now() - interval '3 days';

    -- sempre que sobra exemplar livre e há gente na fila, chama o próximo
    for liv in
        select l.* from livros l
        where exists (select 1 from reservas r where r.livro_id = l.id and r.status = 'ativa')
    loop
        livres := liv.quantidade_disponivel
            - (select count(*) from reservas r where r.livro_id = liv.id and r.status = 'disponivel');

        while livres > 0 loop
            select * into proxima from reservas
                where livro_id = liv.id and status = 'ativa'
                order by data_reserva asc
                limit 1;
            exit when not found;

            update reservas set status = 'disponivel', data_disponivel = now(), aviso_pendente = true
                where id = proxima.id;
            livres := livres - 1;
        end loop;
    end loop;
exception
    when others then
        -- a arrumação nunca pode quebrar a tela de ninguém
        null;
end;
$function$;


-- Reservar: só quando não há exemplar livre para o aluno; devolve a posição na fila
CREATE OR REPLACE FUNCTION public.reservar_livro(p_usuario_id bigint, p_livro_id bigint)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
    liv livros;
    usu usuarios;
    livres int;
    posicao int;
begin
    select * into liv from livros where id = p_livro_id;
    if liv.id is null then
        raise exception 'Livro não encontrado.';
    end if;
    select * into usu from usuarios where id = p_usuario_id;
    if usu.id is null then
        raise exception 'Usuário não encontrado.';
    end if;

    if exists (select 1 from emprestimos where usuario_id = p_usuario_id and livro_id = p_livro_id and status = 'ativo') then
        raise exception 'Você já está com este livro emprestado.';
    end if;
    if exists (select 1 from reservas where usuario_id = p_usuario_id and livro_id = p_livro_id and status in ('ativa', 'disponivel')) then
        raise exception 'Você já está na fila de reserva deste livro.';
    end if;

    -- exemplares guardados para outras reservas não contam como livres
    livres := liv.quantidade_disponivel
        - (select count(*) from reservas where livro_id = p_livro_id and status = 'disponivel');
    if livres > 0 then
        raise exception 'Este livro está disponível agora: é só pegar emprestado.';
    end if;

    insert into reservas (usuario_id, livro_id, data_reserva, status)
    values (p_usuario_id, p_livro_id, now(), 'ativa');

    select count(*) into posicao from reservas where livro_id = p_livro_id and status = 'ativa';

    perform registrar_log(p_usuario_id, 'Reserva feita', format('%s (%sº da fila)', liv.titulo, posicao));

    return json_build_object(
        'message', format('Reserva feita! Você é o %sº da fila.', posicao),
        'posicao', posicao,
        'livro_titulo', liv.titulo,
        'usuario_email', usu.email,
        'usuario_nome', usu.nome
    );
end;
$function$;


-- Cancelar: se a reserva cancelada guardava um exemplar, o próximo da fila é chamado na hora
CREATE OR REPLACE FUNCTION public.cancelar_reserva(p_usuario_id bigint, p_reserva_id bigint)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
    res reservas;
begin
    select * into res from reservas where id = p_reserva_id;
    if res.id is null then
        raise exception 'Reserva não encontrada.';
    end if;
    if res.usuario_id <> p_usuario_id and not eh_bibliotecario(p_usuario_id) then
        raise exception 'Acesso negado.';
    end if;
    if res.status not in ('ativa', 'disponivel') then
        raise exception 'Essa reserva já foi encerrada.';
    end if;

    update reservas set status = 'cancelada', aviso_pendente = false where id = p_reserva_id;
    perform libro_manutencao();

    return json_build_object('message', 'Reserva cancelada.');
end;
$function$;


-- Catálogo: exemplares guardados para reservas (de outras pessoas) e tamanho da fila, por livro
create or replace function public.situacao_reservas(p_usuario_id bigint)
 returns json
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
    resultado json;
begin
    select coalesce(json_object_agg(t.livro_id, json_build_object('guardados', t.guardados, 'fila', t.fila)), '{}'::json)
        into resultado
    from (
        select livro_id,
               count(*) filter (where status = 'disponivel' and usuario_id is distinct from p_usuario_id)::int as guardados,
               count(*) filter (where status = 'ativa')::int as fila
        from reservas
        where status in ('ativa', 'disponivel')
        group by livro_id
    ) t;
    return resultado;
end;
$function$;


-- E-mails de "sua reserva chegou" que a arrumação automática deixou pendentes.
-- O site da biblioteca chama esta função e envia os e-mails (o banco não envia sozinho).
create or replace function public.pegar_avisos_pendentes(p_solicitante_id bigint)
 returns json
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
    resultado json;
begin
    if not eh_bibliotecario(p_solicitante_id) then
        raise exception 'Acesso negado.';
    end if;

    perform libro_manutencao();

    with pendentes as (
        update reservas set aviso_pendente = false
        where status = 'disponivel' and aviso_pendente
        returning usuario_id, livro_id, data_disponivel
    )
    select coalesce(json_agg(json_build_object(
                'email', u.email,
                'nome', u.nome,
                'livro_titulo', l.titulo,
                'retirar_ate', p.data_disponivel + interval '3 days'
           )), '[]'::json)
        into resultado
    from pendentes p
    join usuarios u on u.id = p.usuario_id
    join livros l on l.id = p.livro_id;

    return resultado;
end;
$function$;


-- Apagar avaliação: o próprio aluno, ou a biblioteca (moderação). A moderação fica no log.
create or replace function public.apagar_avaliacao(p_usuario_id bigint, p_avaliacao_id bigint)
 returns json
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
    av avaliacoes;
    v_titulo text;
    v_autor text;
begin
    select * into av from avaliacoes where id = p_avaliacao_id;
    if av.id is null then
        raise exception 'Avaliação não encontrada.';
    end if;
    if av.usuario_id <> p_usuario_id and not eh_bibliotecario(p_usuario_id) then
        raise exception 'Você só pode apagar a sua própria avaliação.';
    end if;

    delete from avaliacoes where id = p_avaliacao_id;

    if av.usuario_id <> p_usuario_id then
        select titulo into v_titulo from livros where id = av.livro_id;
        select nome into v_autor from usuarios where id = av.usuario_id;
        perform registrar_log(p_usuario_id, 'Avaliação removida pela biblioteca',
            format('%s (avaliação de %s)', coalesce(v_titulo, 'livro'), coalesce(v_autor, 'aluno')));
    end if;

    return json_build_object('message', 'Avaliação removida.');
end;
$function$;


create or replace function public.alertas_usuario(p_usuario_id bigint)
 returns json
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
    hoje date;
    resultado json;
begin
    perform libro_manutencao();
    hoje := libro_hoje();

    select coalesce(json_agg(row_to_json(a) order by a.ordem, a.mensagem), '[]'::json) into resultado
    from (
        select 1 as ordem, 'suspensao' as tipo, 'erro' as nivel, '⛔' as icone,
               format('Sua conta está suspensa até %s. Nesse período não é possível pegar livros.',
                      to_char(s.data_fim, 'DD/MM/YYYY')) as mensagem,
               null::text as acao
        from suspensoes s
        where s.usuario_id = p_usuario_id and s.status = 'ativa' and s.data_fim >= hoje

        union all

        select 2, 'atraso', 'erro', '⚠️',
               format('"%s" está atrasado há %s dia(s). Devolva na biblioteca para evitar suspensão.',
                      l.titulo, hoje - libro_data_local(e.data_prevista_devolucao)),
               'emprestimos'
        from emprestimos e
        join livros l on l.id = e.livro_id
        where e.usuario_id = p_usuario_id and e.status = 'ativo'
        and libro_data_local(e.data_prevista_devolucao) < hoje

        union all

        select 3, 'vencendo', 'aviso', '⏳',
               format('"%s" vence %s. Renove ou devolva a tempo.', l.titulo,
                      case libro_data_local(e.data_prevista_devolucao) - hoje
                          when 0 then 'hoje'
                          when 1 then 'amanhã'
                          else 'em ' || (libro_data_local(e.data_prevista_devolucao) - hoje) || ' dias'
                      end),
               'emprestimos'
        from emprestimos e
        join livros l on l.id = e.livro_id
        where e.usuario_id = p_usuario_id and e.status = 'ativo'
        and libro_data_local(e.data_prevista_devolucao) between hoje and hoje + 3

        union all

        select 4, 'reserva', 'sucesso', '🔖',
               format('Sua reserva de "%s" chegou!%s', l.titulo,
                      case when r.data_disponivel is null then ''
                           else ' Retire até ' || to_char((r.data_disponivel + interval '3 days') at time zone 'America/Sao_Paulo', 'DD/MM "às" HH24:MI') || '.'
                      end),
               'reservas'
        from reservas r
        join livros l on l.id = r.livro_id
        where r.usuario_id = p_usuario_id and r.status = 'disponivel'

        union all

        select 5, 'fila', 'info', '🔖',
               format('Você é o %sº da fila de reserva de "%s".',
                      (select count(*) from reservas r2
                        where r2.livro_id = r.livro_id and r2.status = 'ativa'
                        and r2.data_reserva <= r.data_reserva),
                      l.titulo),
               'reservas'
        from reservas r
        join livros l on l.id = r.livro_id
        where r.usuario_id = p_usuario_id and r.status = 'ativa'
    ) a;

    return resultado;
end;
$function$;


create or replace function public.detalhes_livro(p_usuario_id bigint, p_livro_id bigint)
 returns json
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
    liv livros;
    v_media numeric;
    v_total int;
    v_distribuicao json;
    v_recentes json;
    v_fila int;
    v_total_emprestimos int;
    v_usuario json;
    v_guardados int;
    v_reservado_ate timestamptz;
begin
    select * into liv from livros where id = p_livro_id;
    if liv.id is null then
        raise exception 'Livro não encontrado.';
    end if;

    select round(avg(nota)::numeric, 1), count(*)::int into v_media, v_total
        from avaliacoes where livro_id = p_livro_id;

    select json_agg(json_build_object(
                'nota', n,
                'total', (select count(*) from avaliacoes where livro_id = p_livro_id and nota = n)
            ) order by n desc)
        into v_distribuicao
        from generate_series(1, 5) as n;

    select coalesce(json_agg(row_to_json(t)), '[]'::json) into v_recentes
    from (
        select a.id, a.usuario_id, coalesce(u.nome, 'Aluno') as nome, a.nota, a.comentario, a.data_avaliacao
        from avaliacoes a
        left join usuarios u on u.id = a.usuario_id
        where a.livro_id = p_livro_id
        order by a.data_avaliacao desc
        limit 20
    ) t;

    select count(*) into v_fila from reservas where livro_id = p_livro_id and status = 'ativa';
    select count(*) into v_total_emprestimos from emprestimos where livro_id = p_livro_id;

    -- exemplares guardados para reservas de outras pessoas (não contam como livres)
    select count(*)::int, min(data_disponivel) + interval '3 days'
        into v_guardados, v_reservado_ate
        from reservas
        where livro_id = p_livro_id and status = 'disponivel'
        and (p_usuario_id is null or usuario_id <> p_usuario_id);

    if p_usuario_id is not null then
        v_usuario := json_build_object(
            'favorito', exists (select 1 from favoritos where usuario_id = p_usuario_id and livro_id = p_livro_id),
            'pode_avaliar', exists (select 1 from emprestimos where usuario_id = p_usuario_id and livro_id = p_livro_id),
            'minha_avaliacao', (
                select row_to_json(x) from (
                    select id, nota, comentario from avaliacoes
                    where usuario_id = p_usuario_id and livro_id = p_livro_id
                ) x
            ),
            'emprestimo_ativo', (
                select row_to_json(x) from (
                    select id, data_prevista_devolucao from emprestimos
                    where usuario_id = p_usuario_id and livro_id = p_livro_id and status = 'ativo'
                    limit 1
                ) x
            ),
            'reserva', (
                select row_to_json(x) from (
                    select rr.id, rr.status, rr.data_disponivel,
                           rr.data_disponivel + interval '3 days' as retirar_ate,
                           (select count(*) from reservas r2
                             where r2.livro_id = rr.livro_id and r2.status = 'ativa'
                             and r2.data_reserva <= rr.data_reserva) as posicao
                    from reservas rr
                    where rr.usuario_id = p_usuario_id and rr.livro_id = p_livro_id and rr.status in ('ativa', 'disponivel')
                    limit 1
                ) x
            )
        );
    end if;

    return json_build_object(
        'livro', row_to_json(liv),
        'total_emprestimos', v_total_emprestimos,
        'fila_reservas', v_fila,
        'livres', greatest(liv.quantidade_disponivel - v_guardados, 0),
        'guardados', v_guardados,
        'reservado_ate', v_reservado_ate,
        'avaliacoes', json_build_object(
            'media', v_media,
            'total', v_total,
            'distribuicao', v_distribuicao,
            'recentes', v_recentes
        ),
        'usuario', v_usuario
    );
end;
$function$;


commit;

select 'Libro v4 instalado' as resultado;
