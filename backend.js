const request = require('request');
const _ = require('lodash');
const firebase = require('firebase');
var deckCode = 0;
var current_user = undefined;


/*****************************************************************************

    BACKEND FIREBASE DATABASE METHODS

******************************************************************************/


/*
	Add accounts info to JSON, CREATE GAME FILE if it doesnt exist already
*/
var addAccount = async (email, password, fname, lname) => {
    var success = `Successfully created account ${email} `;
    var failed = "";
    await firebase.auth().createUserWithEmailAndPassword(email, password)
            .then (async function success(userData) {
                var user = userData.user
                await writeUserData(user.uid, user.email, fname, lname, "default", 
                    "https://firebasestorage.googleapis.com/v0/b/bigorsmall-9c0b5.appspot.com/o/default.jpg?alt=media&token=8579b809-6edc-442d-9363-c4a1688a4d1a");
                await retrieveUserData(userData.user.uid)
            }).catch (function(error) {
              // Handle Errors here.
              var errorCode = error.code;
              var errorMessage = error.message;

              failed = `${errorCode}: ${errorMessage}`;
              success = ""
            });

    return {
        success : success,
        failed : failed
    }
};

/*
    Check Json file to see if user exists and returns it if it does.
    Returns undefined if it does not. Check -> Get Login Info -> Login
*/
var loginAccount = async (email, password, result, response) => {
    var result = { failed : "", deck : "", current_user : undefined }
    await firebase.auth().signInWithEmailAndPassword(email, password)

            .then (async function success(userData) {

                current_user = await retrieveUserData(userData.user.uid);
                result.current_user = current_user;
                result.current_user.uid = userData.user.uid;
                console.log('Login Successful')
                return result

            }).catch (function(error) {
                // Handle Errors here.
                var errorCode = error.code;
                var errorMessage = error.message;
                result.failed = `${errorCode}: ${errorMessage}`
                console.log('Login Failed')
            });

    return result
};

var deleteAccount = async () => {
    var user = await firebase.auth().currentUser;
    var uid = user.uid
    message = user.delete().then(async function() {
        await firebase.database().ref(`users/${uid}`).remove();
        
        return 'delete success'
    }).catch(function(error){
        return error.message
    })
    console.log(message);
    return message
}

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
            test.balance += score;
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

                    sortable.push([test[key].email, test[key].score, key])
                }
            }

            sortable.sort(function (a, b) {
                return b[1] - a[1];
            });
        })

    return sortable
}



/*****************************************************************************

    VOID() DATA SAVE/RETRIEVAL METHODS

******************************************************************************/

async function writeUserData(userId, email, fname, lname, name, imageUrl) {
    await firebase.database().ref(`users/${userId}`).set({
        email: email,
        profile_picture : {
            name: name,
            url: imageUrl
        },
        music : {
            name: `None`,
            url: `None`
        },
        cardback: {
            name: `red_cardback`,
            url: `/img/cardbacks/red_cardback.png`
        },
        inventory : {
            profile_pictures: [{
                name: name,
                url: imageUrl
            }],
            cardback:[{
                name: 'red_cardback',
                url: '/img/cardbacks/red_cardback.png'
            }],
            music:[{
                name: 'none',
                url: 'none'
            }]
        }, 
        fname: fname,
        lname: lname,
        balance: 0,
        prizes:[],
        big_or_small: {
            games_played: 0,
            games_won: 0,
            high_score: 0
        },
        cardbomb:{
            games_played: 0,
            games_won: 0,
            high_score: 0
        },
        joker: {
            games_played: 0,
            games_won: 0,
            high_score: 0
        }
    });
}

async function retrieveAllUsers(){
    var test = {};
    var sortable = [];

    await firebase.database().ref(`users`).once('value')
        .then(async function(snapshot) {

            test = await snapshot.val();

            for (var key in test) {
                if (test.hasOwnProperty(key)) { 
                    sortable.push(test[key]);
                }
            }
            console.log('Retrieved all users')

        }).catch(function(error){
            console.log(error.message);
        });

    return sortable
}

async function retrieveUserData(userId){
    var test = {}
    await firebase.database().ref(`users/${userId}`).once('value')
        .then(async function(snapshot) {
            test = await snapshot.val()
            console.log('Retrieved User Data')
        })
        .catch(function(error){
            console.log(error.message);
        })

    return test
}

/*****************************************************************************

    ITEMS SHOP/INVENTORY FUNCTIONS

******************************************************************************/

/*
    Saves username and their personal scores in JSON file and return
    a high score results message depending on situation.
 */
async function buyItem(userId, itemId, itemUrl, type, price) {
    var test = {}

    message = await firebase.database().ref(`users/${userId}`).once('value')
        .then(async function(snapshot) {
            test = await snapshot.val()

            if ( (test.balance - price) >= 0){
                var prebalance = test.balance
                test.balance -= price;
                if ( !itemExists(test.inventory.profile_pictures, itemId) && (type == "profile_pictures")) {
                    test.inventory.profile_pictures.push({
                        name: itemId,
                        url: itemUrl
                    })
                }else if ( !itemExists(test.inventory.cardback, itemId) && (type == "cardback")) {
                    test.inventory.cardback.push({
                        name: itemId,
                        url: itemUrl
                    })
                }else if ( !itemExists(test.inventory.music, itemId) && (type == "music")) {
                    test.inventory.music.push({
                        name: itemId,
                        url: itemUrl
                    })
                }else{
                    return `User already has ${itemId}`;
                }
                await firebase.database().ref(`users/${userId}`).set(test);
                
                return `Purchased! ${prebalance} - ${price} = ${test.balance}`;

            } else {
                return 'Sorry, you do not have enough balance';
            }
        }).catch(function(e){
            console.log(e.message)
            return e.message
        })

    return message;
}


/*
    Change user's ${type} data(ex. music, cardback, avatar) with a object
    containing the name and url
 */
async function changeProfile(user_id, name, url, type){
    message = `No changes made to ${type}`;

    message = await firebase.database().ref(`users/${user_id}/${type}`).set({
        name: name,
        url: url
    }).then(function(){
        return `Successfully changed ${type}`;
    }).catch(function(){
        return `Failed to change ${type}`;
    });

    return message;
}



/*****************************************************************************

    DECK OF CARDS API METHODS

******************************************************************************/

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
                reject('Cannot connect to Deck Of Cards API')
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
                reject('Cannot connect to Deck Of Cards API')
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
                reject('Cannot connect to Deck Of Cards API')
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

function isInArray(value, array) {
    return array.indexOf(value) > -1;
}

function itemExists(arr, name, type) {

    const found = arr.some(el => el.name === name);
    console.log('arr ', arr)
    console.log('name', name)
    console.log('found ', found)
    return found;
}


module.exports = {
    shuffleDeck,
    drawDeck,
    getDeck,
    addAccount,
    loginAccount,
    saveHighScore,
    getHighScores,
    retrieveAllUsers,
    retrieveUserData,
    buyItem,
    deleteAccount,
    changeProfile
};