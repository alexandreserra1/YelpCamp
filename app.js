if (process.env.NODE_ENV !== "production") {
    require('dotenv').config();
}

const express = require('express'); // Importando o framework Express
const path = require('path'); // Módulo para lidar com caminhos de arquivos
const mongoose = require('mongoose'); // ODM para MongoDB
const ejsMate = require('ejs-mate'); // Engine de template EJS
const session = require('express-session'); // Middleware de gerenciamento de sessões do usuário
const flash = require('connect-flash'); // Middleware para mensagens flash
const ExpressError = require('./utils/ExpressError'); // Classe de erro personalizada
const methodOverride = require('method-override'); // Middleware para suportar métodos HTTP como PUT e DELETE

// Configurando a conexão com o banco de dados
const passport = require('passport');
const LocalStrategy = require('passport-local');
const User = require('./models/user');
const helmet = require('helmet');

//rotas
const userRoutes = require('./routes/users');
const campgrounds = require('./routes/campgrounds');
const reviews = require('./routes/reviews');


const MongoStore = require('connect-mongo');

const dbUrl = process.env.DB_URL || 'mongodb://localhost:27017/yelp-camp';
const mongoSanitize = require('express-mongo-sanitize');//MongoSanitize é um middleware que ajuda a proteger contra ataques XSs

//'mongodb://localhost:27017/yelp-camp'
mongoose.connect(dbUrl, {

});


const db = mongoose.connection; // Obtendo a conexão com o banco de dados
db.on('error', console.error.bind(console, 'connection error:')); // Lidando com erros de conexão
db.once('open', () => { // Quando a conexão é aberta com sucesso
    console.log('Connected to database'); // Mensagem indicando que a conexão foi estabelecida
});

const app = express(); // Inicializando o aplicativo Express

app.engine('ejs', ejsMate); // Configurando o engine de template EJS
app.set('view engine', 'ejs'); // Configurando o mecanismo de visualização para EJS
app.set('views', path.join(__dirname, 'views')); // Configurando o diretório de visualizações

app.use(express.urlencoded({ extended: true })); // Middleware para analisar dados do formulário
app.use(methodOverride('_method')); // Middleware para suportar PUT e DELETE via HTML forms
app.use(express.static(path.join(__dirname, 'public'))); // Public domain para arquivos estáticos (CSS, JS)
app.use(
    mongoSanitize({
        replaceWith: '_',
    }),
);// Método para sanitizar os campos do MongoDB evitando ataques XSS

const secret = process.env.SECRET || 'thisshouldbeabettersecret!';


const store = MongoStore.create({
    mongoUrl: dbUrl,
    touchAfter: 24 * 60 * 60,
    crypto: {
        secret: 'thisshouldbeabettersecret!'
    }
});

const sessionConfig = {
    store,
    name: 'session',
    secret,
    resave: false, // Defina como false para evitar que a sessão seja regravada no armazenamento desnecessariamente
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
}


// Configura o middleware de sessão do Express
app.use(session(sessionConfig));

// Configura o middleware de mensagens flash
app.use(flash());

// Configura o middleware de autenticação
app.use(helmet());

const scriptSrcUrls = [
    "https://stackpath.bootstrapcdn.com/",
    "https://api.tiles.mapbox.com/",
    "https://api.mapbox.com/",
    "https://kit.fontawesome.com/",
    "https://cdnjs.cloudflare.com/",
    "https://cdn.jsdelivr.net",
];
const styleSrcUrls = [
    "https://kit-free.fontawesome.com/",
    "https://stackpath.bootstrapcdn.com/",
    "https://api.mapbox.com/",
    "https://api.tiles.mapbox.com/",
    "https://fonts.googleapis.com/",
    "https://use.fontawesome.com/",
];
const connectSrcUrls = [
    "https://api.mapbox.com/",
    "https://a.tiles.mapbox.com/",
    "https://b.tiles.mapbox.com/",
    "https://events.mapbox.com/",
];
const fontSrcUrls = [];
app.use(
    helmet.contentSecurityPolicy({
        directives: {
            defaultSrc: [],
            connectSrc: ["'self'", ...connectSrcUrls],
            scriptSrc: ["'unsafe-inline'", "'self'", ...scriptSrcUrls],
            styleSrc: ["'self'", "'unsafe-inline'", ...styleSrcUrls],
            workerSrc: ["'self'", "blob:"],
            objectSrc: [],
            imgSrc: [
                "'self'",
                "blob:",
                "data:",
                "https://res.cloudinary.com/dboznbktl/", //SHOULD MATCH YOUR CLOUDINARY ACCOUNT! 
                "https://images.unsplash.com/",
            ],
            fontSrc: ["'self'", ...fontSrcUrls],
        },
    })
);

// Inicializa o middleware de autenticação Passport
app.use(passport.initialize());

// Configura o middleware de sessão do Passport
app.use(passport.session());

// Configura a estratégia de autenticação local do Passport
passport.use(new LocalStrategy(User.authenticate()));

// Configura a função de serialização de usuário do Passport
passport.serializeUser(User.serializeUser());

// Configura a função de desserialização de usuário do Passport
passport.deserializeUser(User.deserializeUser());


app.use((req, res, next) => {
    res.locals.currentUser = req.user; // Obtendo o usuário logado   atualmente na aplicação
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
})
// Campos customizáveis da mensagem de erro


app.use('/', userRoutes)
app.use('/campgrounds', campgrounds)
app.use('/campgrounds/:id/reviews', reviews); // Corrigindo o caminho da rota
app.get('/', (req, res) => { // Rota para a página inicial
    res.render('home'); // Renderizando a página inicial
});


app.all('*', (req, res, next) => { // Middleware para lidar com rotas não encontradas
    next(new ExpressError('Page Not Found', 404)); // Criando um novo erro 404
});

app.use((err, req, res, next) => { // Middleware de tratamento de erros
    const { statusCode = 500 } = err; // Obtendo o código de status do erro
    if (!err.message) err.message = 'Something went wrong!'; // Mensagem de erro padrão
    res.status(statusCode).render('error', { err }); // Renderizando a página de erro com a mensagem de erro
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Serving on port ${port}`)
})
