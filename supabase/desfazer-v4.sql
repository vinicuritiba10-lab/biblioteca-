-- =====================================================================
-- DESFAZER a v4: volta as funções alteradas para a versão anterior
-- (v2 e as originais do banco). As funções novas da v4 e a coluna
-- reservas.aviso_pendente ficam, mas não atrapalham.
-- =====================================================================

begin;

create or replace function public.libro_manutencao()
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
    r reservas;
    liv livros;
    proxima_id bigint;
begin
    update suspensoes set status = 'cumprida'
        where status = 'ativa' and data_fim < libro_hoje();

    update reservas res set status = 'concluida'
        where res.status in ('ativa', 'disponivel')
        and exists (
            select 1 from emprestimos e
            where e.usuario_id = res.usuario_id
            and e.livro_id = res.livro_id
            and e.data_emprestimo >= res.data_reserva
        );

    -- reservas que já estavam disponíveis antes da v2 ganham a data de agora
    update reservas set data_disponivel = now()
        where status = 'disponivel' and data_disponivel is null;

    for r in
        select * from reservas
        where status = 'disponivel' and data_disponivel < now() - interval '48 hours'
    loop
        update reservas set status = 'expirada' where id = r.id;

        select * into liv from livros where id = r.livro_id;
        if liv.quantidade_disponivel > 0 then
            select id into proxima_id from reservas
                where livro_id = r.livro_id and status = 'ativa'
                order by data_reserva asc limit 1;
            if proxima_id is not null then
                update reservas set status = 'disponivel', data_disponivel = now()
                    where id = proxima_id;
            end if;
        end if;
    end loop;
exception
    when others then
        -- a arrumação nunca pode quebrar a tela de ninguém
        null;
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
                           else ' Retire até ' || to_char((r.data_disponivel + interval '48 hours') at time zone 'America/Sao_Paulo', 'DD/MM "às" HH24:MI') || '.'
                      end),
               'reservas'
        from reservas r
        join livros l on l.id = r.livro_id
        where r.usuario_id = p_usuario_id and r.status = 'disponivel'
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
                    select id, status, data_disponivel from reservas
                    where usuario_id = p_usuario_id and livro_id = p_livro_id and status in ('ativa', 'disponivel')
                    limit 1
                ) x
            )
        );
    end if;

    return json_build_object(
        'livro', row_to_json(liv),
        'total_emprestimos', v_total_emprestimos,
        'fila_reservas', v_fila,
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

create or replace function public.apagar_avaliacao(p_usuario_id bigint, p_avaliacao_id bigint)
 returns json
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
    av avaliacoes;
begin
    select * into av from avaliacoes where id = p_avaliacao_id;
    if av.id is null then
        raise exception 'Avaliação não encontrada.';
    end if;
    if av.usuario_id <> p_usuario_id and not eh_bibliotecario(p_usuario_id) then
        raise exception 'Você só pode apagar a sua própria avaliação.';
    end if;

    delete from avaliacoes where id = p_avaliacao_id;

    return json_build_object('message', 'Avaliação apagada.');
end;
$function$;

CREATE OR REPLACE FUNCTION public.reservar_livro(p_usuario_id bigint, p_livro_id bigint)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
    liv livros;
    reserva_existente int;
begin
    select * into liv from livros where id = p_livro_id;
    if liv.id is null then
        raise exception 'Livro não encontrado.';
    end if;
    if liv.quantidade_disponivel > 0 then
        raise exception 'Esse livro já está disponível, não precisa reservar.';
    end if;

    select count(*) into reserva_existente from reservas
        where usuario_id = p_usuario_id and livro_id = p_livro_id and status in ('ativa', 'disponivel');
    if reserva_existente > 0 then
        raise exception 'Você já tem uma reserva para esse livro.';
    end if;

    insert into reservas (usuario_id, livro_id, data_reserva, status)
    values (p_usuario_id, p_livro_id, now(), 'ativa');

    return json_build_object('message', 'Reserva feita! Você será avisado quando o livro voltar.');
end;
$function$;

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

    update reservas set status = 'cancelada' where id = p_reserva_id;

    return json_build_object('message', 'Reserva cancelada.');
end;
$function$;

commit;

select 'Funções da v4 desfeitas' as resultado;
