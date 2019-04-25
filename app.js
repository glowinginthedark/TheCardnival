const hbs = require('hbs');
const express = require('express');
const bodyParser = require('body-parser');
const backend = require('./backend');

const port = process.env.PORT || 8080;

var app = express();
var deck = 0;
var card = 0;
var card2 = 0;
var cardback = "https://playingcardstop1000.com/wp-content/uploads/2018/11/Back-Russian-historical-cards-200x300.jpg"
var score = 0;
var current_user = undefined

hbs.registerPartials(__dirname + '/views/partials');
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


app.set('view engine', 'hbs');
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

/*
    Make RESTFUL GET request and render the homepage of the BigOrSmall Game.
    It is also the registration page.
 */
app.get('/', function (request, response) {
    response.render('register.hbs', {
        title: 'Big or Small | Registration'
    })
});

/*
    Make RESTFUL POST request and create new user account. Will provide
    appropriate output depending on existing user in data storage.
 */
app.post('/register', (request, response) => {
    try {
        var username = request.body.username;
        var password = request.body.password;
        var signup = backend.addAccount(username, password);
        success = "";
        failed = "";
        if (signup) {
            success = `Successfully created account ${username} `
        } else {
            failed = `Account ${username} already exists`
        }
        response.render('register.hbs', {
            title: 'Big or Small | Registration',
            success: success,
            failed: failed
        })
    } catch (e) {
        console.log(e)
    }
});

/*
    Make RESTFUL GET request and render the login screen to
    proceed to the game
 */
app.get('/login', (request, response) => {
    current_user = undefined
    response.render('login.hbs', {
        title: 'Big or Small | Login'
    })
});

/*
    Make RESTFUL POST request and start game as player with
    login information. Disables game feature until it is started.
 */
app.post('/game', async (request, response) => {
    try {
        var username = request.body.username;
        var password = request.body.password;
        var login = backend.loginAccount(username, password);

        if (login !== undefined) {
            console.log('game');
            current_user = login;
            deck = await backend.getDeck(1);
            renderGame(request, response, "disabled", cardback, cardback, deck.remaining, "")
        } else {
            console.log('login');
            response.render('login.hbs', {
                title: 'Big or Small | Login',
                failed: `Account ${username} credentials are wrong or does not exist`
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
        var high_scores = await backend.getHighScores();
        var output_rankings = "";
        high_scores.forEach(function (item, index, array) {
            output_rankings += `${index + 1}. User-${item[0]} | Points-${item[1]} \n`
        });
        if (output_rankings.length === 0) {
            output_rankings = "No Rankings currently \n"
        }
        console.log(output_rankings);
        response.render('rankings.hbs', {
            title: 'Big or Small | Rankings',
            rankings: output_rankings
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
            score += 1;
            card = card2;
            if (card2.remaining > 0) {
                card2 = await backend.drawDeck(deck.deck_id, 1);
                renderGame(request, response, "", card.cards[0].image, cardback, card.remaining, "")
            } else {
                var win_message = `Congratulations, you have finished the deck with ${score} point`;
                if (current_user !== undefined) {
                    await backend.saveHighScore(current_user.username, score)
                }
                renderGame(request, response, "", card.cards[0].image, cardback, card.remaining, win_message)
            }
        } else {
            var lose_message = `Sorry, you have lost with ${score}`;
            if (current_user !== undefined) {
                await backend.saveHighScore(current_user.username, score);
                lose_message = `New Personal High Score ${score}`
            }
            renderGame(request, response, "disabled", card.cards[0].image, card2.cards[0].image, card.remaining,
                lose_message)
            score = 0;
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
            score += 4;
            card = card2;
            if (card2.remaining > 0) {
                card2 = await backend.drawDeck(deck.deck_id, 1);
                renderGame(request, response, "", card.cards[0].image, cardback, card.remaining, "")
            } else {
                var win_message = `Congratulations, you have finished the deck with ${score} point`;
                if (current_user !== undefined) {
                    await backend.saveHighScore(current_user.username, score)
                }
                renderGame(request, response, "", card.cards[0].image, cardback, card.remaining, win_message)
            }
        } else {
            var lose_message = `Sorry, you have lost with ${score}`;
            if (current_user !== undefined) {
                await backend.saveHighScore(current_user.username, score);
                lose_message = `New Personal High Score ${score}`
            }
            renderGame(request, response, "disabled", card.cards[0].image, card2.cards[0].image, card.remaining,
                lose_message);
            score = 0;
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
            score += 1;
            card = card2;
            if (card2.remaining > 0) {
                card2 = await backend.drawDeck(deck.deck_id, 1);
                renderGame(request, response, "", card.cards[0].image, cardback, card.remaining, "")
            } else {
                var win_message = `Congratulations, you have finished the deck with ${score} point`;
                if (current_user !== undefined) {
                    await backend.saveHighScore(current_user.username, score)
                }
                renderGame(request, response, "", card.cards[0].image, cardback, card.remaining, win_message)
            }
        } else {
            var lose_message = `Sorry, you have lost with ${score}`;
            if (current_user !== undefined) {
                await backend.saveHighScore(current_user.username, score);
                lose_message = `New Personal High Score ${score}`
            }
            renderGame(request, response, "disabled", card.cards[0].image, card2.cards[0].image, card.remaining,
                lose_message)
            score = 0;
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

app.listen(port, () => {
    console.log(`Server is up on the port ${port}`)
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

/*
    Renders the game screen with different display options based on parameters
 */
function renderGame(request, response, state, first_card, second_card, remaining, game_state) {
    var name = "Guest";
    if (current_user !== undefined) {
        name = current_user.username
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
        username: name,
        game_state: game_state
    });
}