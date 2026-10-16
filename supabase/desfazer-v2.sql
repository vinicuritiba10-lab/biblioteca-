-- =====================================================================
-- DESFAZER a v2: volta as 5 funções que a migracao-v2.sql alterou para
-- exatamente como estavam antes (copiadas do banco em 16/10/2026).
-- As tabelas novas (avaliacoes, favoritos) e as funções novas ficam,
-- mas não atrapalham nada: o site antigo simplesmente não as usa.
-- =====================================================================

begin;

CREATE OR REPLACE FUNCTION public.listar_meus_emprestimos(p_usuario_id bigint)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
    resultado json;
begin
    select coalesce(json_agg(row_to_json(t)), '[]'::json) into resultado
    from (
        select
            e.id, e.data_emprestimo, e.data_prevista_devolucao, e.data_devolucao_real,
            e.status, e.renovacoes_restantes,
            json_build_object('titulo', l.titulo, 'autor', l.autor, 'categoria', l.categoria, 'capa_url', l.capa_url) as livro
        from emprestimos e
        join livros l on l.id = e.livro_id
        where e.usuario_id = p_usuario_id
        order by e.data_emprestimo desc
    ) t;
    return resultado;
end;
$function$;

CREATE OR REPLACE FUNCTION public.listar_minhas_reservas(p_usuario_id bigint)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
    resultado json;
begin
    select coalesce(json_agg(row_to_json(t)), '[]'::json) into resultado
    from (
        select
            r.id, r.data_reserva, r.status,
            json_build_object('titulo', l.titulo, 'autor', l.autor, 'capa_url', l.capa_url) as livro
        from reservas r
        join livros l on l.id = r.livro_id
        where r.usuario_id = p_usuario_id and r.status in ('ativa', 'disponivel')
        order by r.data_reserva desc
    ) t;
    return resultado;
end;
$function$;

CREATE OR REPLACE FUNCTION public.devolver_livro(p_usuario_id bigint, p_emprestimo_id bigint)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
    emp emprestimos;
    liv livros;
    usu usuarios;
    dias_atraso int;
    data_fim_susp date;
    suspensao_existente int;
    reserva_antiga reservas;
    houve_suspensao boolean := false;
begin
    select * into emp from emprestimos where id = p_emprestimo_id;
    if emp.id is null then
        raise exception 'Empréstimo não encontrado.';
    end if;
    if emp.usuario_id <> p_usuario_id and not eh_bibliotecario(p_usuario_id) then
        raise exception 'Acesso negado.';
    end if;
    if emp.status = 'devolvido' then
        raise exception 'Livro já foi devolvido.';
    end if;

    select * into liv from livros where id = emp.livro_id;
    select * into usu from usuarios where id = emp.usuario_id;

    update emprestimos set data_devolucao_real = now(), status = 'devolvido' where id = p_emprestimo_id;

    if now() > emp.data_prevista_devolucao then
        dias_atraso := ceil(extract(epoch from (now() - emp.data_prevista_devolucao)) / 86400);
        data_fim_susp := current_date + dias_atraso;

        select count(*) into suspensao_existente from suspensoes
            where usuario_id = emp.usuario_id and status = 'ativa';

        if suspensao_existente = 0 then
            insert into suspensoes (usuario_id, emprestimo_id, motivo, dias_atraso, data_inicio, data_fim, status)
            values (emp.usuario_id, emp.id, 'Devolução em atraso', dias_atraso, current_date, data_fim_susp, 'ativa');
            houve_suspensao := true;
        end if;
    end if;

    update livros set quantidade_disponivel = quantidade_disponivel + 1 where id = emp.livro_id;

    select * into reserva_antiga from reservas
        where livro_id = emp.livro_id and status = 'ativa'
        order by data_reserva asc limit 1;
    if reserva_antiga.id is not null then
        update reservas set status = 'disponivel' where id = reserva_antiga.id;
    end if;

    perform registrar_log(emp.usuario_id, 'Livro devolvido', liv.titulo || case when houve_suspensao then ' (com atraso, suspensão aplicada)' else '' end);

    return json_build_object(
        'message', 'Livro devolvido com sucesso!',
        'suspensao_criada', houve_suspensao,
        'usuario_email', usu.email,
        'usuario_nome', usu.nome,
        'livro_titulo', liv.titulo,
        'dias_atraso', dias_atraso,
        'data_fim_suspensao', data_fim_susp
    );
end;
$function$;

CREATE OR REPLACE FUNCTION public.pegar_emprestado(p_usuario_id bigint, p_livro_id bigint)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
    liv livros;
    total_ativos int;
    ja_tem_esse int;
    limite_maximo constant int := 2;
begin
    select * into liv from livros where id = p_livro_id;
    if liv.id is null then
        raise exception 'Livro não encontrado.';
    end if;
    if liv.quantidade_disponivel <= 0 then
        raise exception 'Livro não disponível para empréstimo.';
    end if;

    select count(*) into ja_tem_esse from emprestimos
        where usuario_id = p_usuario_id and livro_id = p_livro_id and status = 'ativo';
    if ja_tem_esse > 0 then
        raise exception 'Você já está com um exemplar deste livro emprestado.';
    end if;

    select count(*) into total_ativos from emprestimos
        where usuario_id = p_usuario_id and status = 'ativo';
    if total_ativos >= limite_maximo then
        raise exception 'Você já atingiu o limite de % livros emprestados ao mesmo tempo.', limite_maximo;
    end if;

    insert into emprestimos (usuario_id, livro_id, data_emprestimo, data_prevista_devolucao, status)
    values (p_usuario_id, p_livro_id, now(), now() + interval '7 days', 'ativo');

    update livros set quantidade_disponivel = quantidade_disponivel - 1 where id = p_livro_id;

    perform registrar_log(p_usuario_id, 'Empréstimo realizado', liv.titulo);

    return json_build_object('message', 'Empréstimo realizado! Devolva em até 7 dias.');
end;
$function$;

CREATE OR REPLACE FUNCTION public.renovar_emprestimo(p_usuario_id bigint, p_emprestimo_id bigint)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
    emp emprestimos;
    liv livros;
    usu usuarios;
    nova_data timestamptz;
begin
    select * into emp from emprestimos where id = p_emprestimo_id;
    if emp.id is null then
        raise exception 'Empréstimo não encontrado.';
    end if;
    if emp.usuario_id <> p_usuario_id and not eh_bibliotecario(p_usuario_id) then
        raise exception 'Acesso negado.';
    end if;
    if emp.status <> 'ativo' then
        raise exception 'Apenas empréstimos ativos podem ser renovados.';
    end if;
    if emp.renovacoes_restantes <= 0 then
        raise exception 'Limite de renovações atingido (máximo 2).';
    end if;

    select * into liv from livros where id = emp.livro_id;
    select * into usu from usuarios where id = emp.usuario_id;

    nova_data := emp.data_prevista_devolucao + interval '7 days';

    update emprestimos set
        data_prevista_devolucao = nova_data,
        renovacoes_restantes = renovacoes_restantes - 1
    where id = p_emprestimo_id;

    return json_build_object(
        'message', 'Empréstimo renovado com sucesso.',
        'nova_data_devolucao', nova_data,
        'renovacoes_restantes', emp.renovacoes_restantes - 1,
        'usuario_email', usu.email,
        'usuario_nome', usu.nome,
        'livro_titulo', liv.titulo
    );
end;
$function$;

commit;

select 'Funções antigas restauradas' as resultado;
