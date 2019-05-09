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
var cardback = "/img/cardbacks/red_cardback.png";
var music = "";
var score = 0;
var current_user = undefined;
var nav_email = "Guest";
var balance = undefined;

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

// hbs.registerHelper('message', (text) => {
//     return text.toUpperCase();
// });


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
        balance : balance
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
            nav_email: nav_email,
            balance: balance
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
            balance = undefined;
            cardback = "/img/cardbacks/red_cardback.png";
            music = "";
        }).catch(function (error) {
            // An error happened.
        });

    response.render('login.hbs', {
        title: 'Big or Small | Login',
        nav_email: nav_email,
        balance: balance
    })
});

/*
    Make RESTFUL GET request and render the login screen to
    proceed to the game.
 */
app.get('/login', (request, response) => {
    response.render('login.hbs', {
        title: 'Big or Small | Login',
        nav_email: nav_email,
        balance: balance
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
            balance = current_user.balance;
            cardback = current_user.cardback.url;
            music = current_user.music.url;
            deck = login.deck;
            console.log(`current user: ${current_user.email}`);
            await renderProfile(current_user.uid, request, response);
        } else {
            response.render('login.hbs', {
                title: 'Big or Small | Login',
                failed: login.failed,
                nav_email: nav_email,
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
            nav_email: nav_email,
            balance: balance
        })
    } catch (e) {
        console.log(e.message)
    }
});

app.post('/flip', async (request, response) => {
    var flip1 = `<button class="button1" name="flip1">Flip This Card</button>\n`
    var flip2 = `<button class="button2" name="flip2">Flip This Card</button>\n`
    var flip3 = `<button class="button3" name="flip3">Flip This Card</button>\n`
    var flip4 = `<button class="button4" name="flip4">Flip This Card</button>\n`
    var flip5 = `<button class="button5" name="flip5">Flip This Card</button>\n`
    deck_id = await backend.getDeck(1)
    cards = await backend.drawDeck(deck_id.deck_id, 5)
    message = ""
    movesleft = 5
    if(movesleft > 0){
        if (cards.cards[0].image == "https://deckofcardsapi.com/static/img/JS.png" || cards.cards[0].image == "https://deckofcardsapi.com/static/img/JD.png" || 
            cards.cards[0].image == "https://deckofcardsapi.com/static/img/JH.png" || cards.cards[0].image == "https://deckofcardsapi.com/static/img/JC.png") {
            message = "Congradulations, you have won!"
        renderJack(request, response, "", cards.cards[0].image, cardback, cardback, cardback, cardback, movesleft, message)
        }else if (cards.cards[1].image == "https://deckofcardsapi.com/static/img/JS.png" || cards.cards[1].image == "https://deckofcardsapi.com/static/img/JD.png" || 
            cards.cards[1].image == "https://deckofcardsapi.com/static/img/JH.png" || cards.cards[1].image == "https://deckofcardsapi.com/static/img/JC.png") {
            message = "Congradulations, you have won!"
        renderJack(request, response, "", cardback, cards.cards[1].image, cardback, cardback, cardback, movesleft, message)
        }else if (cards.cards[2].image == "https://deckofcardsapi.com/static/img/JS.png" || cards.cards[2].image == "https://deckofcardsapi.com/static/img/JD.png" || 
            cards.cards[2].image == "https://deckofcardsapi.com/static/img/JH.png" || cards.cards[2].image == "https://deckofcardsapi.com/static/img/JC.png") {
            message = "Congradulations, you have won!"
        renderJack(request, response, "", cardback, cardback, cards.cards[2].image, cardback, cardback, movesleft, message)
        }else if (cards.cards[3].image == "https://deckofcardsapi.com/static/img/JS.png" || cards.cards[3].image == "https://deckofcardsapi.com/static/img/JD.png" || 
            cards.cards[3].image == "https://deckofcardsapi.com/static/img/JH.png" || cards.cards[3].image == "https://deckofcardsapi.com/static/img/JC.png") {
            message = "Congradulations, you have won!"
        renderJack(request, response, "", cardback, cardback, cardback, cardback, cards.cards[3].image, movesleft, message)
        }else if (cards.cards[4].image == "https://deckofcardsapi.com/static/img/JS.png" || cards.cards[4].image == "https://deckofcardsapi.com/static/img/JD.png" || 
            cards.cards[4].image == "https://deckofcardsapi.com/static/img/JH.png" || cards.cards[4].image == "https://deckofcardsapi.com/static/img/JC.png") {
            message = "Congradulations, you have won!"
        renderJack(request, response, "", cardback, cardback, cardback, cardback, cards.cards[4].image, movesleft, message)
        }
        else{
        renderJack(request, response, "", cards.cards[0].image, cards.cards[1].image, cards.cards[2].image, cards.cards[3].image, cards.cards[4].image, movesleft, message, flip1, flip2, flip3, flip4, flip5)    
        }
    }
    else{
        renderJack(request, response, "disabled", cards.cards[0].image, cards.cards[1].image, cards.cards[2].image, cards.cards[3].image, cards.cards[4].image, 0, "You have run out of turns, you lose")
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

// if user flips jack, correct guess
// app.post('/flip', async (request, response) => {
//     try {
//         if () {
//             correctGuess(1, request, response);
//         } else {
//             wrongGuess(request, response);
//         }
//     } catch (e) {
//         console.log(e)
//     }
// });

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

app.get('/jack', async (request, response) => {
    try {
        message = ""
        var flip1 = `<button class="button1" name="flip1">Flip This Card</button>\n`
        var flip2 = `<button class="button2" name="flip2">Flip This Card</button>\n`
        var flip3 = `<button class="button3" name="flip3">Flip This Card</button>\n`
        var flip4 = `<button class="button4" name="flip4">Flip This Card</button>\n`
        var flip5 = `<button class="button5" name="flip5">Flip This Card</button>\n`
        renderJack(request, response, "", cardback, cardback, cardback, cardback, cardback, 5, message, flip1, flip2, flip3, flip4, flip5)
    }
    catch (e){
        console.log(e);
    }
});

/*
    Make RESTFUL GET request and render game
 */
app.get(`/gameportal`, async (request, response) => {
    response.render('gameportal.hbs', {
        title: 'Big or Small | Game Portal',
        nav_email: nav_email,
        balance: balance
    })
});

/*
    Make RESTFUL GET request and render game
 */
app.get(`/store`, async (request, response) => {
    response.render('store.hbs', {
        title: 'Big or Small | Store',
        nav_email: nav_email,
        balance: balance
    })
});

/*
    Make RESTFUL GET request and render game
 */
app.post(`/buy`, async (request, response) => {
    message = "Please Login First";
    item_info = request.body.url.split(',');
    if (current_user != undefined) {
        message = await backend.buyItem(current_user.uid, item_info[0], item_info[1], item_info[2], parseInt(item_info[3], 10));
    }
    if (balance >= parseInt(item_info[3], 10)){
        balance -= parseInt(item_info[3], 10);
    }
    if(message.startsWith('Purchased!')){
        message = `<div class="alert bg-success col-lg-12 col-lg-offset-1 text-center" role="alert" style="display: hidden;">
                    <span class="closebtn" onclick="this.parentElement.style.display='none';">&times;</span>
                    <strong>${message}</strong>
                </div>`;

    }else{
        message = `<div class="alert bg-danger col-lg-12 col-lg-offset-1 text-center" role="alert" style="display: hidden;">
                    <span class="closebtn" onclick="this.parentElement.style.display='none';">&times;</span>
                    <strong>${message}</strong>
                </div>`;
    }
    response.render('store.hbs', {
        title: 'Big or Small | Store',
        result: message,
        nav_email: nav_email,
        balance: balance
    })
});

app.get('/profile/:email', async (request, response) => {
    var test = {};
    var id = request.params.email
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
            nav_email: nav_email,
        })
    }
});

app.post(`/avatar`, async (request, response) => {
    var test = {};
    var name_url = request.body.url.split(',');
    if (current_user != undefined) {
        message = await backend.changeProfile(current_user.uid, name_url[0], name_url[1], 'profile_picture')
        console.log(message);
        renderProfile(current_user.uid, request, response);
    } else {
        renderProfile(current_user.uid, request, response);
    }
});

app.post(`/music`, async (request, response) => {
    var test = {};
    var name_url = request.body.url.split(',');
    if (current_user != undefined) {
        message = await backend.changeProfile(current_user.uid, name_url[0], name_url[1], 'music')
        test = await backend.retrieveUserData(current_user.uid)
        music = test.music.url;

        console.log(message);
        renderProfile(current_user.uid, request, response);
    } else {
        renderProfile(current_user.uid, request, response);
    }
});

app.post(`/cardback`, async (request, response) => {
    var test = {};
    var name_url = request.body.url.split(',');
    if (current_user != undefined) {
        message = await backend.changeProfile(current_user.uid, name_url[0], name_url[1], 'cardback')
        test = await backend.retrieveUserData(current_user.uid)
        cardback = test.cardback.url;
        
        console.log(message);
        renderProfile(current_user.uid, request, response);
    } else {
        renderProfile(current_user.uid, request, response);
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
    if (card2.remaining > 0) {
        renderGame(request, response, "", card.cards[0].image, cardback, card.remaining, `Correct Guess!`);
    } else {
        var win_message = `Congratulations, you have finished the deck with ${score} point`;
        if (current_user !== undefined) {
            await backend.saveHighScore(current_user.uid, current_user.email, score, true);
            balance += score;
        }
        renderGame(request, response, "", card.cards[0].image, cardback, card.remaining, win_message)
    }
}

async function wrongGuess(request, response) {
    var lose_message = `Sorry, you have lost with ${score} points`;
    if (current_user !== undefined) {
        lose_message = await backend.saveHighScore(current_user.uid, current_user.email, score, false);
        balance += score;
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
        nav_email: nav_email,
        balance: balance,
        music: music,
        cardback: cardback
    });
}

function renderJack(request, response, state, card1, card2, card3, card4, card5, movesleft, message, button1, button2, button3, button4, button5) {
    response.render('jack.hbs', {
        title: 'Jack | Play Game',
        state: state,
        card: card1,
        card2: card2,
        card3: card3,
        card4: card4,
        card5: card5,
        movesleft: movesleft,
        message: message,
        button1: button1,
        button2: button2,
        button3: button3,
        button4: button4,
        button5: button5
    });
}


async function renderProfile(user_id, request, response) {
    var user_info = {};
    try{
        if (user_id != undefined) {
            user_info = await backend.retrieveUserData(user_id);
            user_info.profile_picture = `src="${user_info.profile_picture.url}"`
            if (current_user != undefined){
                if(current_user.uid == user_id){
                    //SELF VIEW
                    nav_email = user_info.email;
                    user_info.nav_email = user_info.email;
                    balance = user_info.balance;
                    user_info.avatars = await arrObjToHTMLString(user_info.inventory.profile_pictures,'');
                    user_info.musics = await arrObjToHTMLString(user_info.inventory.music,'');
                    user_info.cardbacks = await arrObjToHTMLString(user_info.inventory.cardback,'');
                }else{
                    //OTHER USERS VIEW
                    user_info.nav_email = nav_email;
                    user_info.balance = balance;
                    user_info.avatars = await arrObjToHTMLString(user_info.inventory.profile_pictures,'display: none;');
                    user_info.musics = await arrObjToHTMLString(user_info.inventory.music,'display: none;');
                    user_info.cardbacks = await arrObjToHTMLString(user_info.inventory.cardback,'display: none;');   
                } 
            }else{
                //GUEST VIEW
                user_info.nav_email = 'Guest';
                user_info.balance = undefined;
                user_info.avatars = await arrObjToHTMLString(user_info.inventory.profile_pictures,'display: none;');
                user_info.musics = await arrObjToHTMLString(user_info.inventory.music,'display: none;');
                user_info.cardbacks = await arrObjToHTMLString(user_info.inventory.cardback,'display: none;');
            }
        }
        user_info.title = `Big or Small | Profile`;

        await response.render('profile.hbs', user_info)
    }catch(error){

    }
}

//type="button"
//onclick="testFunction('${item}')"

async function arrObjToHTMLString(array, not_user){
    html_string = ""

    array.forEach((element, index, array) => {
            if (index % 2 == 0) {
                html_string += `<div class="row">\n`
            }
            var item = element.name + ',' + element.url
            html_string += `    <div class="card-body col-6">\n`
            html_string += `        <img src="${element.url}" alt="default"\n`
            html_string += `        style="max-width: 100%; height: auto">\n`
            html_string += `        <button class="btn wide-btn btn-info" name="url" value="${element.name},${element.url}" style="${not_user}">Use this!</button>\n`
            html_string += `    </div>\n`

            if (index % 2 == 1) {
                html_string += `</div>\n`
            }
        })
 
    if(array.length % 2 == 1){
        html_string += `</div>\n`
    }

    return html_string
}
module.exports = app;