const email = document.querySelector('#email');
const senha = document.querySelector('#password');
const form = document.querySelector('#form');


form.addEventListener('submit', (e) =>{
    let enviarform = true

     if(!email.value){
        console.log("o email esta vazio")
        enviarform = false
    }


    if(!senha.value){
        console.log("a senha esta vazia")
        enviarform = false
    }

    if (!enviarform){
        e.preventDefault()
    }
})