const hbs = require('hbs');
const express = require('express');
const bodyParser = require('body-parser');
const backend = require('./backend');
const firebase = require('firebase');
const path = require('path');
const port = process.env.PORT || 8080;

var app = express();
var deck = 0;
var card = 0;
var card2 = 0;
// var cardback = "https://playingcardstop1000.com/wp-content/uploads/2018/11/Back-Russian-historical-cards-200x300.jpg"
// var cardback = "https://i.pinimg.com/originals/10/80/a4/1080a4bd1a33cec92019fab5efb3995d.png"
var cardback = "/img/red_cardback.png";
var score = 0;
var current_user = undefined;
var nav_email = "Guest";

var config = {
    apiKey: "AIzaSyDOvbL8GIvalFiVeUKmdEL5N7Dv6qzPk-w",
    authDomain: "bigorsmall-9c0b5.firebaseapp.com",
    databaseURL: "https://bigorsmall-9c0b5.firebaseio.com",
    projectId: "bigorsmall-9c0b5",
    storageBucket: "bigorsmall-9c0b5.appspot.com",
    messagingSenderId: "369969153728"
};
firebase.initializeApp(config);

var rootRef = firebase.database().ref();

app.listen(port, () => {
    console.log(`Server is up on the port ${port}`)
});

app.set('view engine', 'hbs');
app.use(express.static(path.join(__dirname, '/public')));
app.use('/', express.static(__dirname));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

/*****************************************************************************

 HBS REGISTER

 ******************************************************************************/

hbs.registerPartials(path.join(__dirname, '/views/partials'));

hbs.registerHelper('breaklines', function (text) {
    text = hbs.Utils.escapeExpression(text);
    text = text.replace(/(\r\n|\n|\r)/gm, '<br>');
    return new hbs.SafeString(text);
});

hbs.registerHelper('getCurrentYear', () => {
    return new Date().getFullYear();
});

hbs.registerHelper('message', (text) => {
    return text.toUpperCase();
});


/*****************************************************************************

    REST ENDPOINTS

******************************************************************************/
/*
    Make RESTFUL GET request and render the homepage of the BigOrSmall Game.
    It is also the registration page.
 */
app.get('/', function (request, response) {
    response.render('register.hbs', {
        title: 'Big or Small | Registration',
        nav_email: nav_email,
    })
});

/*
    Register Page Add Account Endpoint
 */
app.post('/register', async (request, response) => {
    try {
        var email = request.body.email;
        var password = request.body.password;
        var fname = request.body.fname;
        var lname = request.body.lname;
        var result = await backend.addAccount(email, password, fname, lname);
        response.render('register.hbs', {
            title: 'Big or Small | Registration',
            success: result.success,
            failed: result.failed,
            nav_email: nav_email
        })
    } catch (e) {
        console.log(e)
    }
});

/*
    Make RESTFUL POST request and signout. Render login screen.
 */
app.post('/signout', async (request, response) => {
    current_user = undefined

    await firebase.auth().signOut()
        .then(function () {
            // Sign-out successful.
            nav_email = 'Guest';
        }).catch(function (error) {
            // An error happened.
        });

    response.render('login.hbs', {
        title: 'Big or Small | Login',
        nav_email: nav_email
    })
});

/*
    Make RESTFUL GET request and render the login screen to
    proceed to the game.
 */
app.get('/login', (request, response) => {
    response.render('login.hbs', {
        title: 'Big or Small | Login',
        nav_email: nav_email
    })
});

/*
    Make RESTFUL POST request and start game as player with
    login information. Disables game feature until it is started.
 */
app.post('/game', async (request, response) => {
    try {
        var email = request.body.email;
        var password = request.body.password;
        var login = await backend.loginAccount(email, password, request, response);
        if (login.failed == "") {

            current_user = login.current_user;
            nav_email = current_user.email;
            deck = login.deck;
            console.log(`current user: ${current_user.email}`);
            await renderProfile(current_user.uid, request, response);
        }else{
            response.render('login.hbs', {
                    title: 'Big or Small | Login',
                    failed: login.failed
            })
        }
    } catch (e) {
        console.log(e)
    }
});

/*
    Make RESTFUL POST request, render a new game with a reshuffled deck
    and new scores
 */
app.post('/newgame', async (request, response) => {
    score = 0;
    try {
        deck = await backend.shuffleDeck(deck.deck_id);
        card = await backend.drawDeck(deck.deck_id, 1);
        card2 = await backend.drawDeck(deck.deck_id, 1);
        renderGame(request, response, "", card.cards[0].image, cardback, card.remaining, "")
    } catch (e) {
        console.log(e)
    }
});

/*
    Make RESTFUL GET request, render the screen and display all
    existing players with their personal high scores
 */
app.get('/rankings', async (request, response) => {
    try {
        var high_scores = await backend.getHighScores('big_or_small');
        var output_rankings = "";
        high_scores.forEach(function (item, index, array) {
            output_rankings += `${index + 1}. ${item[0]} | ${item[1]} Points 
                                <a href="/profile/${item[2]}">Profile</a> <br>`
        });
        if (output_rankings.length === 0) {
            output_rankings = "No Rankings currently \n"
        }
        response.render('rankings.hbs', {
            title: 'Big or Small | Rankings',
            rankings: output_rankings,
            nav_email: nav_email
        })
    } catch (e) {
        console.log(e.message)
    }
});

/*
    Make RESTFUL POST request and determine results if player picked
    next card as BIGGER than the current card. Display results based
    on outcome. Will also save better high scores.
 */
app.post('/bigger', async (request, response) => {
    try {
        if (getNumeric(card.cards[0].value) < getNumeric(card2.cards[0].value)) {
            correctGuess(1, request, response);
        } else {
            wrongGuess(request, response);
        }
    } catch (e) {
        console.log(e)
    }
});

/*
    Make RESTFUL POST request and determine results if player picked
    next card as TIE. Display results based on outcome. Will also
    save better high scores.
 */
app.post('/tie', async (request, response) => {
    try {
        if (getNumeric(card.cards[0].value) === getNumeric(card2.cards[0].value)) {
            correctGuess(4, request, response);

        } else {
            wrongGuess(request, response);
        }
    } catch (e) {
        console.log(e)
    }
});


/*
    Make RESTFUL POST request and determine results if player picked
    next card as SMALLER than the current card. Display results based
    on outcome. Will also save better high scores.
 */
app.post('/smaller', async (request, response) => {
    try {
        if (getNumeric(card.cards[0].value) > getNumeric(card2.cards[0].value)) {
            correctGuess(1, request, response);
        } else {
            wrongGuess(request, response);
        }
    } catch (e) {
        console.log(e)
    }
});

/*
    Make RESTFUL GET request and render game
 */
app.get(`/deck`, async (request, response) => {
    try {
        deck = await backend.getDeck(1);
        renderGame(request, response, "disabled", cardback, cardback, deck.remaining, "")
    } catch (e) {
        console.log(e)
    }
});

/*
    Make RESTFUL GET request and render game
 */
app.get(`/gameportal`, async (request, response) => {
    response.render('gameportal.hbs', {
        title: 'Big or Small | Game Portal'
    })
});

/*
    Make RESTFUL GET request and render game
 */
app.get(`/store`, async (request, response) => {
    response.render('store.hbs', {
        title: 'Big or Small | Store'
    })
});

/*
    Make RESTFUL GET request and render game
 */
app.post(`/buy`, async (request, response) => {
    message = "Please Login First";
    item_info = request.body.url.split(',');

    if(current_user != undefined){
        message = await backend.buyItem(current_user.uid, item_info[0], item_info[1], item_info[2], parseInt(item_info[3], 10));
    }
    response.render('store.hbs', {
            title: 'Big or Small | Store',
            result: message
    })
});

app.get('/profile/:email', async (request, response) => {
    var test = {};
    var id = request.params.email
    // if (id != undefined) {
    //     test = await backend.retrieveUserData(id);
    //     test.profile_picture = 'src="asset/' + test.profile_picture + '.jpg"'
    // }
    // test.title = `Big or Small | ${id} Profile`;
    // await response.render('profile.hbs', test)
    renderProfile(id, request, response);
});


app.get(`/profile`, async (request, response) => {
    var test = {};
    if (current_user != undefined) {
        renderProfile(current_user.uid, request, response);
    } else {
        await response.render('login.hbs', {
            title: 'Big or Small | Login',
            failed: 'Login first to view account status',
            nav_email: nav_email
        })
    }
});

app.post(`/avatar`, async (request, response) => {
    var test = {};
    if (current_user != undefined) {
        test = await backend.retrieveUserData(current_user.uid);
        test.title = `Big or Small | Your Profile`;
        test.nav_email = nav_email;
        await response.render('profile.hbs', test);

        console.log(request.body)
    } else {
        await response.render('login.hbs', {
            title: 'Big or Small | Login',
            failed: 'Login first to view account status',
            nav_email: nav_email
        })
    }
});

/*
    Convert Card strings and return appropriate corresponding values
 */
function getNumeric(card) {
    var trimmed = card.trim()
    if (trimmed === "KING") {
        return 13
    } else if (trimmed === "QUEEN") {
        return 12
    } else if (trimmed === "JACK") {
        return 11
    } else if (trimmed === "ACE") {
        return 1
    } else {
        return parseInt(trimmed)
    }
}

async function correctGuess(weight, request, response) {
    score += weight;
    card = card2;
    card2 = await backend.drawDeck(deck.deck_id, 1);
    renderGame(request, response, "", card.cards[0].image, cardback, card.remaining, "")
    if (card2.remaining > 0) {} else {
        var win_message = `Congratulations, you have finished the deck with ${score} point`;
        if (current_user !== undefined) {
            await backend.saveHighScore(current_user.uid, current_user.email, score, true);
        }
        renderGame(request, response, "", card.cards[0].image, cardback, card.remaining, win_message)
    }
}

async function wrongGuess(request, response) {
    var lose_message = `Sorry, you have lost with ${score} points`;
    if (current_user !== undefined) {
        lose_message = await backend.saveHighScore(current_user.uid, current_user.email, score, false);
    }
    renderGame(request, response, "disabled", card.cards[0].image, card2.cards[0].image, card.remaining,
        lose_message);
    score = 0;
}

/*
    Renders the game screen with different display options based on parameters
 */
function renderGame(request, response, state, first_card, second_card, remaining, game_state) {
    var name = "Guest";
    if (current_user !== undefined) {
        name = `${current_user.fname} ${current_user.lname}`;
    }
    response.render('game.hbs', {
        title: 'Big or Small | Play Game',
        card: first_card,
        card2: second_card,
        bigger: state,
        smaller: state,
        tie: state,
        score: score,
        remaining: remaining,
        name: name,
        game_state: game_state,
        nav_email: nav_email
    });
}

async function renderProfile(user_id, request, response) {
    var test = {};
    if (user_id != undefined) {
        test = await backend.retrieveUserData(user_id);
        test.nav_email = nav_email;
        test.profile_picture = `src="${test.profile_picture.url}"`
    }
    test.title = `Big or Small | Profile`;

    await response.render('profile.hbs', test)
}

module.exports = app;