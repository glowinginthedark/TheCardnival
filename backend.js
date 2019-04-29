const fs = require('fs');
const request = require('request');
const _ = require('lodash');
const firebase = require('firebase');
var deckCode = 0;
var current_user = undefined;
var score = 0;
var cardback = "https://playingcardstop1000.com/wp-content/uploads/2018/11/Back-Russian-historical-cards-200x300.jpg"
var accounts = {
    users: {},
    high_scores: {}
};



const file = 'test_users.json';


/*
	Add accounts info to JSON, CREATE GAME FILE if it doesnt exist already
*/
var addAccount = async (email, password) => {
    var success = `Successfully created account ${email} `;
    var failed = "";
    await firebase.auth().createUserWithEmailAndPassword(email, password)
            .then (async function success(userData) {
                await writeUserData(userData.user.uid,userData.user.email,"")
                await retrieveUserData(userData.user.uid)
            }).catch (function(error) {
              // Handle Errors here.
              var errorCode = error.code;
              var errorMessage = error.message;

              failed = `${errorCode}: ${errorMessage}`
              success = ""
            });

    return {
        success : success,
        failed : failed
    }
};

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

/*
	Overwrite/Write currently modified Game data to existing/new JSON
*/
function writeToJSON() {
    var resultString = JSON.stringify(accounts);
    fs.writeFileSync(file, resultString);
}

/*
	Check if an user exist within JSON file
*/
function accountExist(username) {
    var accExist = (accounts['users'][username] !== undefined);

    if (!accExist) {
        console.log(`Account ${username} does not exist`);
    }
    return accExist
}

/*
	Check Json file to see if user exists and returns it if it does.
	Returns undefined if it does not. Check -> Get Login Info -> Login
*/
var loginAccount = async (email, password, result, response) => {
    var result = { failed : "", deck : "", current_user : undefined }
    await firebase.auth().signInWithEmailAndPassword(email, password)
            .then(async function success(userData) {
                current_user = userData.user;
                retrieveUserData(current_user.uid)
                result.current_user = userData.user
                deck = await getDeck(1);
                result.deck = deck
                renderGame(request, response, "disabled", cardback, cardback, deck.remaining, "")
            }).catch(function(error) {
                // Handle Errors here.
                var errorCode = error.code;
                var errorMessage = error.message;
                result.failed = `${errorCode}: ${errorMessage}`
                console.log('Login failed')
                response.render('login.hbs', {
                        title: 'Big or Small | Login',
                        failed: result.failed
                })
            });
    // await firebase.auth().signInWithEmailAndPassword(email, password).catch(function(error) {
    //     // Handle Errors here.
    //     var errorCode = error.code;
    //     var errorMessage = error.message;
    //     result.failed = `${errorCode}: ${errorMessage}`
    // });

    return result
};

/*
    Saves username and their personal scores in JSON file and return
    a high score results message depending on situation.
 */
async function saveHighScore(userId, email, score, won) {
    var score_message = `Sorry, you have lost with ${score}`;
    var test = {}

    if (userId === undefined) {
        return "Sorry, Guests cannot be part of the rankings"
    }

    await firebase.database().ref(`users/${userId}`).once('value')
        .then(async function(snapshot) {
            test = await snapshot.val()
            test.big_or_small.games_played += 1;

            if (won) {
                test.big_or_small.games_played += 1;
            }

            if (score >=  test.big_or_small.high_score) {
                await firebase.database().ref(`big_or_small/${userId}/`).set({
                    score: score,
                    email: email
                });
                test.big_or_small.high_score = score
                score_message = `New Personal High Score ${score}`
            }

            await firebase.database().ref(`users/${userId}`).set(test);
        })

    return score_message
}

/*
    Retrieve an array of high scores from JSON file and
    sort them from highest to lowest using sortable.
 */
async function getHighScores(game_name) {
    var test = {}
    var sortable = [];
    
    await firebase.database().ref(`${game_name}`).once('value')
        .then(async function(snapshot) {

            test = await snapshot.val()

            for (var key in test) {
                if (test.hasOwnProperty(key)) { 

                    sortable.push([test[key].email, test[key].score])
                }
            }

            sortable.sort(function (a, b) {
                return b[1] - a[1];
            });
        })

    return sortable
}

/*
	Validate Username and Password and return a value based on their validation.
	Temporarily placed for flexibility use
*/
function validateCredentials(username, password) {
    return true;
    //return (validateAccountNum(username) && validatePassword(password));
}

/*
	Validate account username format,
	Temporary placement for flexibility use
*/
function validateAccountNum(username) {
    return true;
}

/*
	Validates account password's length,
	Temporary placement for flexibility use
*/
function validatePassword(pass) {
    return true;
}


/*
    Get X counts of new decks from deckofcards api
 */
var getDeck = (count) => {
    return new Promise((resolve, reject) => {
        request({
            url: `https://deckofcardsapi.com/api/deck/new/shuffle/?deck_count=${count}`,
            json: true
        }, (error, response, body) => {
            if (error) {
                reject('Cannot connect to RestCountries API')
            } else if (body.status === '401') {
                reject('Unauthorized Access to webpage')
            } else if (body.shuffled === '404') {
                reject('No API method supports the URL')
            } else if (body.error !== undefined) {
                reject(body.error)
            } else {
                deckCode = body.deck_id
                resolve(body)
            }
        });
    })
};


/*
    Draw X counts of cards from a deck using the deck id retrieved from deckofcards api
 */
var drawDeck = (deck_id, count) => {
    return new Promise((resolve, reject) => {
        request({
            url: `https://deckofcardsapi.com/api/deck/${deck_id}/draw/?count=${count}`,
            json: true
        }, (error, response, body) => {
            if (error) {
                reject('Cannot connect to RestCountries API')
            } else if (body.status === '401') {
                reject('Unauthorized Access to webpage')
            } else if (body.shuffled === '404') {
                reject('No API method supports the URL')
            } else if (body.error !== undefined) {
                reject(body.error)
            } else {
                resolve(body)
            }
        });
    })
};

/*
    Shuffles the deck based on deck id and returns the shuffled deck's contents.
    From deckofcards api
 */
var shuffleDeck = (deck_id) => {
    return new Promise((resolve, reject) => {
        request({
            url: `https://deckofcardsapi.com/api/deck/${deck_id}/shuffle/`,
            json: true
        }, (error, response, body) => {
            if (error) {
                reject('Cannot connect to RestCountries API')
            } else if (body.status === '401') {
                reject('Unauthorized Access to webpage')
            } else if (body.shuffled === '404') {
                reject('No API method supports the URL')
            } else if (body.error !== undefined) {
                reject(body.error)
            } else {
                resolve(body)
            }
        });
    })
};

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

module.exports = {
    shuffleDeck,
    drawDeck,
    getDeck,
    addAccount,
    loginAccount,
    saveHighScore,
    getHighScores
};