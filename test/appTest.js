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