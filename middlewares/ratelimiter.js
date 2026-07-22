const rateLimit = require('express-rate-limit');

//limites de tentativas ip

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, //15 minutos
    max: 5, // 5 tentativas maximas
    message: {
        error: 'muitas tentativas de login. Tente novamente em 15 minutos.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    //bloqueia ip apos tentativas
    skipSucessfulRequests: false, // conta tentativas, inclusive as bem sucedidas
});

// limite mais rigoroso para recuperacao de senha
const resetPasswordLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 3, //maximo 3 tentativas
    message: {
        error: 'Muitas tentativas de redefinicao. Tente novamente em 1 hora.'
    }
});

modelue.exports = { loginLimiter, resetPasswordLimiter };