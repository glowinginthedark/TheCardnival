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

describe("Test Registering an account", () => {
	it("Testing with an existing email address... Registration should fail.", async () => {
		assert((await backend.addAccount("crap_crap@crap.com", "UnHy`utkV{63;5[", "harry", "kane")).failed, 
			"auth/email-already-in-use: The email address is already in use by another account.");
	});
});

describe("Test retrieving high scores from firebase", () => {
	it("Retrieving high scores... Result should be an array.", async () => {
		assert(Array.isArray(await backend.getHighScores("big_or_small")), true);
	});
});
