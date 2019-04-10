const fs = require('fs');
const request = require('request');
const _ = require('lodash');
var deckCode = 0;
var accounts = {users:{},
                high_scores:{}};

const file = 'test_users.json';


/*
	Add accounts info to JSON, CREATE GAME FILE if it doesnt exist already
*/
var addAccount = (username,password) => {
    if(validateCredentials(username, password)){
        try{
            var readUser = fs.readFileSync(file);
            accounts = JSON.parse(readUser);
        }catch(e){
            console.log(`Error: ${e.message}`);
            console.log(`Creating Account File`);
        }

        if(!accountExist(username)){
            console.log('Creating Account...');
            accounts['users'][username] = {password: password};
            writeToJSON();
            return true
        }else{
            console.log(`Account ${username} already exists`);
            return false
        }
    }
};


/*
	Overwrite/Write currently modified Game data to existing/new JSON
*/
function writeToJSON(){
    var resultString = JSON.stringify(accounts);
    fs.writeFileSync(file, resultString);
}

/*
	Check if an user exist within JSON file
*/
function accountExist(username){
    var accExist = (accounts['users'][username] !== undefined);

    if(!accExist){
        console.log(`Account ${username} does not exist`);
    }
    return accExist
}

/*
	Check Json file to see if user exists and returns it if it does.
	Returns undefined if it does not. Check -> Get Login Info -> Login
*/
var loginAccount = (username, password) =>{
    if(validateCredentials(username, password)){
        try{
            var readUser = fs.readFileSync(file);
            accounts = JSON.parse(readUser);
        }catch(e){
            console.log(`Error: ${e.message}`);
        }

        if(accountExist(username)){
            if(accounts['users'][username].password === password){
                console.log('match');
                return {username: username}

            }else{
                console.log('dont match');
                return undefined
            }
        }else{
            return undefined
        }
    }
};

/*
    Saves username and their personal scores in JSON file and return
    a high score results message depending on situation.
 */
function saveHighScore(username, score){

    try{
        if(username === undefined){
            return "Sorry, Guests cannot be part of the rankings"
        }
        var readUser = fs.readFileSync(file);
        accounts = JSON.parse(readUser);

        if(score > accounts['high_scores'][username] || accounts['high_scores'][username] === undefined){
            accounts['high_scores'][username] = score;
            writeToJSON()
            return `Congratulations, you have a new high score: ${score} points`
        }else{
            return ""
        }
    }catch(e){
        console.log(`Error: ${e.message}`);
        console.log(`Creating Account File`);
    }
}

/*
    Retrieve an array of high scores from JSON file and
    sort them from highest to lowest using sortable.
 */
function getHighScores() {
    try{
        var readUser = fs.readFileSync(file);
        accounts = JSON.parse(readUser);
        var sortable = [];
        for (var user in accounts['high_scores']){
            sortable.push([user,accounts['high_scores'][user]])
        }
        sortable.sort(function (a, b) {
            return b[1] - a[1];
        });
        console.log(sortable);
        return sortable
    }catch(e){
        console.log(`Error: ${e.message}`);
    }
}

/*
	Validate Username and Password and return a value based on their validation.
	Temporarily placed for flexibility use
*/
function validateCredentials(username,password){
    return true;
    //return (validateAccountNum(username) && validatePassword(password));
}

/*
	Validate account username format,
	Temporary placement for flexibility use
*/
function validateAccountNum(username){
    return true;
}

/*
	Validates account password's length,
	Temporary placement for flexibility use
*/
function validatePassword(pass){
    return true;
}


/*
    Get X counts of new decks from deckofcards api
 */
var getDeck = (count) =>{
    return new Promise((resolve, reject) => {
        request({
            url: `https://deckofcardsapi.com/api/deck/new/shuffle/?deck_count=${count}`,
            json: true
        }, (error, response, body) => {
            if(error){
                reject('Cannot connect to RestCountries API')
            }else if(body.status === '401'){
                reject('Unauthorized Access to webpage')
            }else if(body.shuffled === '404'){
                reject('No API method supports the URL')
            }else if(body.error !== undefined){
                reject('Currency not supported')
            }else{
                deckCode = body.deck_id
                resolve(body)
            }
        });
    })
};


/*
    Draw X counts of cards from a deck using the deck id retrieved from deckofcards api
 */
var drawDeck = (deck_id, count) =>{
    return new Promise((resolve, reject) => {
        request({
            url: `https://deckofcardsapi.com/api/deck/${deck_id}/draw/?count=${count}`,
            json: true
        }, (error, response, body) => {
            if(error){
                reject('Cannot connect to RestCountries API')
            }else if(body.status === '401'){
                reject('Unauthorized Access to webpage')
            }else if(body.shuffled === '404'){
                reject('No API method supports the URL')
            }else if(body.error !== undefined){
                reject('Currency not supported')
            }else{
                resolve(body)
            }
        });
    })
};

/*
    Shuffles the deck based on deck id and returns the shuffled deck's contents.
    From deckofcards api
 */
var shuffleDeck = (deck_id) =>{
    return new Promise((resolve, reject) => {
        request({
            url: `https://deckofcardsapi.com/api/deck/${deck_id}/shuffle/`,
            json: true
        }, (error, response, body) => {
            if(error){
                reject('Cannot connect to RestCountries API')
            }else if(body.status === '401'){
                reject('Unauthorized Access to webpage')
            }else if(body.shuffled === '404'){
                reject('No API method supports the URL')
            }else if(body.error !== undefined){
                reject('Currency not supported')
            }else{
                resolve(body)
            }
        });
    })
};

module.exports = {
    shuffleDeck,
    drawDeck,
    getDeck,
    addAccount,
    loginAccount,
    saveHighScore,
    getHighScores
};