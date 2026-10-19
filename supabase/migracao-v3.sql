-- =====================================================================
-- LIBRO v3: só o administrador cria bibliotecários.
--
-- Antes, qualquer pessoa podia se cadastrar como bibliotecário, e um
-- bibliotecário podia mudar o perfil (e até excluir) outros usuários.
-- Agora:
--   cadastrar_usuario     -> toda conta nova é de ALUNO, mesmo que o
--                            navegador mande outro tipo
--   alterar_tipo_usuario  -> só o ADMINISTRADOR muda perfis; o perfil de
--                            um administrador não muda por aqui
--   deletar_usuario       -> só o ADMINISTRADOR exclui usuários; um
--                            administrador não pode ser excluído por aqui
--
-- COMO INSTALAR: Supabase > SQL Editor > + > cole este arquivo > Run.
-- Roda numa transação: se der erro, nada muda. Para voltar atrás,
-- rode supabase/desfazer-v3.sql.
-- Depois de instalar, revise em "Gerenciar Usuários" as contas que já
-- estão como bibliotecário e volte para aluno as que não deveriam ser.
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
    -- p_tipo continua na assinatura para não quebrar chamadas antigas,
    -- mas é ignorado: quem promove bibliotecários é o administrador
    if exists (select 1 from usuarios where email = p_email) then
        raise exception 'Este e-mail já está cadastrado.';
    end if;

    insert into usuarios (nome, email, senha, tipo)
    values (p_nome, p_email, extensions.crypt(p_senha, extensions.gen_salt('bf')), 'aluno')
    returning * into novo_usuario;

    perform registrar_log(novo_usuario.id, 'Cadastro realizado', 'Tipo: aluno');

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
    alvo usuarios;
begin
    if not eh_admin(p_solicitante_id) then
        raise exception 'Apenas o administrador pode alterar o perfil de um usuário.';
    end if;
    if p_novo_tipo not in ('aluno', 'bibliotecario') then
        raise exception 'Tipo inválido. O tipo admin só pode ser definido diretamente no banco de dados.';
    end if;

    select * into alvo from usuarios where id = p_usuario_id;
    if alvo.id is null then
        raise exception 'Usuário não encontrado.';
    end if;
    if alvo.tipo = 'admin' then
        raise exception 'O perfil de um administrador só pode ser alterado direto no banco de dados.';
    end if;

    update usuarios set tipo = p_novo_tipo where id = p_usuario_id;

    perform registrar_log(p_solicitante_id, 'Tipo de usuário alterado', format('%s -> %s', alvo.nome, p_novo_tipo));

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
    alvo usuarios;
begin
    if not eh_admin(p_solicitante_id) then
        raise exception 'Apenas o administrador pode excluir usuários.';
    end if;
    if p_solicitante_id = p_usuario_id then
        raise exception 'Você não pode deletar seu próprio usuário.';
    end if;

    select * into alvo from usuarios where id = p_usuario_id;
    if alvo.id is null then
        raise exception 'Usuário não encontrado.';
    end if;
    if alvo.tipo = 'admin' then
        raise exception 'Um administrador só pode ser excluído direto no banco de dados.';
    end if;

    delete from usuarios where id = p_usuario_id;

    perform registrar_log(p_solicitante_id, 'Usuário excluído', alvo.nome);

    return json_build_object('message', 'Usuário excluído com sucesso.');
exception
    when foreign_key_violation then
        raise exception 'Não é possível excluir: este usuário tem empréstimos ou reservas no histórico.';
end;
$function$;

commit;

select 'Libro v3 instalado' as resultado;
