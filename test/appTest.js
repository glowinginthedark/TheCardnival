const fs = require('fs');
const chai = require('chai');
const chaiHttp = require('chai-http');
const assert = require('chai').assert;
const expect = require('chai').expect;
const should = require('chai').should;
const request = require('supertest');
chai.use(chaiHttp);
const app = require('../app.js');

function wait(ms){
    var start = new Date().getTime();
    var end = start;
    while(end < start + ms) {
        end = new Date().getTime();
    }
}

describe('GET /', function(){
    this.timeout(10000);
    it('it should load page', function(done){
        wait(5000);
        chai.request(app)
            .get('/')
            .end(function(err, res) {
                console.log(err);
                expect(res).to.have.status(200);
                done();
            });
      });
 });