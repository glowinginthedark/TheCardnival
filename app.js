const hbs = require('hbs');
const express = require('express');
const bodyParser = require('body-parser');
const backend = require('./backend');
const firebase = require('firebase');

const port = process.env.PORT || 8080;

var app = express();
var deck = 0;
var card = 0;
var card2 = 0;
var cardback = "https://playingcardstop1000.com/wp-content/uploads/2018/11/Back-Russian-historical-cards-200x300.jpg"
var score = 0;
var current_user = undefined

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
app.post('/register', async (request, response) => {
    try {
        var email = request.body.username;
        var password = request.body.password;
        var result = await backend.addAccount(email, password);

        response.render('register.hbs', {
            title: 'Big or Small | Registration',
            success: result.success,
            failed: result.failed
        })
    } catch (e) {
        console.log(e)
    }
});

/*
    Make RESTFUL GET request and render the login screen to
    proceed to the game
 */
app.post('/signout', (request, response) => {
    current_user = undefined
    // firebase.auth().signOut().then(function() {
    //   // Sign-out successful.
    // }).catch(function(error) {
    //   // An error happened.
    // });
    firebase.auth().signOut()
    .then(function() {
      // Sign-out successful.
    }).catch(function(error) {
      // An error happened.
    });
    rootRef.child('Users').once('value').then(function(snapshot) {
      var username = (snapshot.val() && snapshot.val().username) || 'Anonymous';
      console.log(snapshot.val())
      // ...
    });
    response.render('login.hbs', {
        title: 'Big or Small | Login'
    })
});

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
        var email = request.body.username;
        var password = request.body.password;
        var login = await backend.loginAccount(email, password, request, response);
        current_user = login.current_user
        deck = login.deck
        // var failed = ''
        // await firebase.auth().signInWithEmailAndPassword(email, password)
        //     .then(async function success(userData) {
        //         current_user = userData.user;
        //         retrieveUserData(current_user.uid)
        //         deck = await backend.getDeck(1);
        //         renderGame(request, response, "disabled", cardback, cardback, deck.remaining, "")
        //     }).catch(function(error) {
        //         // Handle Errors here.
        //         var errorCode = error.code;
        //         var errorMessage = error.message;
        //         failed = `${errorCode}: ${errorMessage}`
        //         console.log('Login failed')
        //         response.render('login.hbs', {
        //                 title: 'Big or Small | Login',
        //                 failed: failed
        //         })
        //     });

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
        console.log('happened')
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
        console.log('test 1' + high_scores)
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
app.get(`/home`, async (request, response) => {
    response.render('home.hbs', {
        title: 'Big or Small | Home'
    })
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

async function correctGuess(weight, request, response) {
    // console.log("right guess");
    score += weight;
    card = card2;
    card2 = await backend.drawDeck(deck.deck_id, 1);
    renderGame(request, response, "", card.cards[0].image, cardback, card.remaining, "")
    if (card2.remaining > 0) {
    } else {
        var win_message = `Congratulations, you have finished the deck with ${score} point`;
        if (current_user !== undefined) {
            await backend.saveHighScore(current_user.uid, current_user.email, score, true);
        }
        renderGame(request, response, "", card.cards[0].image, cardback, card.remaining, win_message)
    }
}

async function wrongGuess(request, response) {
    // console.log("wrong guess")
    var lose_message = ''
    if (current_user !== undefined) {
        lose_message = await backend.saveHighScore(current_user.uid, current_user.email, score, false);
    }
    renderGame(request, response, "disabled", card.cards[0].image, card2.cards[0].image, card.remaining,
        lose_message)
    score = 0;
}

/*
    Renders the game screen with different display options based on parameters
 */
function renderGame(request, response, state, first_card, second_card, remaining, game_state) {
    var name = "Guest";
    if (current_user !== undefined) {
        name = current_user.email
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

async function writeUserData(userId, email, imageUrl) {
  await firebase.database().ref(`users/${userId}`).set({
    email: email,
    profile_picture : imageUrl,
    balance: 0,
    prizes:[],
    big_or_small: {
        games_played: 0,
        games_won: 0,
        high_score: 0
    }
  });
}

async function retrieveUserData(userId){
    var test = {}
    await firebase.database().ref(`users/${userId}`).once('value')
        .then(async function(snapshot) {
            await console.log(1)
            await console.log(snapshot.val())
            await console.log(2)
            test = await snapshot.val()
            test.big_or_small.games_played += 1;
            await console.log(test)
            await firebase.database().ref(`users/${userId}`).set(test);
        })

}

function updateUserStat(userId, games_won,games_played, high_score) {
    console.log(firebase.database.ref(`users/${userId}`))
}