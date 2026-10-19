-- =====================================================================
-- DESFAZER a v3: volta cadastrar_usuario, alterar_tipo_usuario e
-- deletar_usuario exatamente como estavam antes (copiadas do banco em 16/10/2026).
-- =====================================================================

begin;

CREATE OR REPLACE FUNCTION public.cadastrar_usuario(p_nome text, p_email text, p_senha text, p_tipo text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
    novo_usuario usuarios;
begin
    if exists (select 1 from usuarios where email = p_email) then
        raise exception 'Este e-mail já está cadastrado.';
    end if;

    insert into usuarios (nome, email, senha, tipo)
    values (p_nome, p_email, extensions.crypt(p_senha, extensions.gen_salt('bf')), p_tipo)
    returning * into novo_usuario;

    perform registrar_log(novo_usuario.id, 'Cadastro realizado', 'Tipo: ' || p_tipo);

    return json_build_object(
        'id', novo_usuario.id,
        'nome', novo_usuario.nome,
        'email', novo_usuario.email,
        'tipo', novo_usuario.tipo
    );
end;
$function$;

CREATE OR REPLACE FUNCTION public.alterar_tipo_usuario(p_solicitante_id bigint, p_usuario_id bigint, p_novo_tipo text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
    v_nome text;
begin
    if not eh_bibliotecario(p_solicitante_id) then
        raise exception 'Acesso negado.';
    end if;
    if p_novo_tipo not in ('aluno', 'bibliotecario') then
        raise exception 'Tipo inválido. O tipo admin só pode ser definido diretamente no banco de dados.';
    end if;

    select nome into v_nome from usuarios where id = p_usuario_id;

    update usuarios set tipo = p_novo_tipo where id = p_usuario_id;

    perform registrar_log(p_solicitante_id, 'Tipo de usuário alterado', format('%s -> %s', v_nome, p_novo_tipo));

    return json_build_object('message', 'Tipo atualizado com sucesso.');
end;
$function$;

CREATE OR REPLACE FUNCTION public.deletar_usuario(p_solicitante_id bigint, p_usuario_id bigint)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
    v_nome text;
begin
    if not eh_bibliotecario(p_solicitante_id) then
        raise exception 'Acesso negado.';
    end if;
    if p_solicitante_id = p_usuario_id then
        raise exception 'Você não pode deletar seu próprio usuário.';
    end if;

    select nome into v_nome from usuarios where id = p_usuario_id;

    delete from usuarios where id = p_usuario_id;

    perform registrar_log(p_solicitante_id, 'Usuário excluído', v_nome);

    return json_build_object('message', 'Usuário excluído com sucesso.');
exception
    when foreign_key_violation then
        raise exception 'Não é possível excluir: este usuário tem empréstimos ou reservas no histórico.';
end;
$function$;

commit;

select 'Funções da v3 desfeitas' as resultado;
