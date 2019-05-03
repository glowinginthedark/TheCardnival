const chai = require('chai');
const chaiHttp = require('chai-http');
const assert = require('chai').assert;
const expect = require('chai').expect;
const should = require('chai').should;
const request = require('supertest');
chai.use(chaiHttp);
const app = require('../app.js');
const backend = require('../backend.js');

describe('GET /', () => {
  it('it should load page', (done) => {
        chai.request(app)
            .get('/')
            .end(async (err, res) => {
            	const result = await res.statusCode;
            	const body = await res.body;
            	done();
            });
      });
 });

chai.should();

dummy_accounts = {
	harry: {
		email: "crap_crap@crap.com",
		password: "UnHy`utkV{63;5[",
		fname: "Harry",
		lname: "Kane"
	},
	chris: {
		email: "chris@chris.com",
		password: "AsD7ss-HJ`tM}q~&",
		fname: "Chris",
		lname: "Johnson"
	}
};

describe("test registering an account", () => {
	it("testing with an existing email address... registration should fail.", async () => {
		assert((await backend.addAccount(dummy_accounts.harry.email,
						dummy_accounts.harry.password,
						dummy_accounts.harry.fname,
						dummy_accounts.harry.lname)).failed, 
			"auth/email-already-in-use: the email address is already in use by another account.");
	});

	it("testing with an new email address... registration should succeed.", async () => {
		assert((await backend.addAccount(dummy_accounts.chris.email,
						dummy_accounts.chris.password,
						dummy_accounts.chris.fname,
						dummy_accounts.chris.lname)).success,
			"Successfully created account" + dummy_accounts.chris.email);
	});

});

describe("Test retrieving high scores from firebase", () => {
	it("Retrieving high scores... Result should be an array.", async () => {
		assert(Array.isArray(await backend.getHighScores("big_or_small")), true);
	});
});
