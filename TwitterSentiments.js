
const { Kafka } = require('kafkajs')
const dotenv = require('dotenv');
var Twitter = require('twitter');

dotenv.config();


const kafka = new Kafka({
    clientId: 'twitter-retrieval-app',
    brokers: [process.env.KAFKA_ZOOKEEPER_CONNECT]
})
const producer = kafka.producer();

producer.connect();

var client = new Twitter({
    consumer_key: process.env.consumer_key,
    consumer_secret: process.env.consumer_secret,
    access_token_key: process.env.access_token_key,
    access_token_secret: process.env.access_token_secret
});

var stream = client.stream('statuses/filter', { 
    track: 'coronavirus,covid-19, covid19',
    language: 'en',
    tweet_mode: 'extended'
});

stream.on('data', function (event) {
    if (event.text && event.retweeted_status === undefined) {
        var record = JSON.stringify({
            id: event.id,
            timestamp: event['created_at'],
            tweet64: (event.extended_tweet !== undefined) ? new Buffer(event.extended_tweet.full_text).toString('base64') : new Buffer(event.text).toString('base64'),
            location: event.user.location
        }); 
        
        if (event.text) {
            console.log(' Tweet: ', (event.extended_tweet !== undefined) ? event.extended_tweet.full_text: event.text);
            console.log('Tweet Location: ', event.user.location);
            //console.log('Full Tweet: ', event);
        }
        else{
            console.log('No tweet text');
        }
        producer.send({
            topic: 'incoming-tweets',
            messages: [{
                value: record
            }],
        })
        .then()
        .catch(e => console.error(`[twitter/producer] ${e.message}`, e))
    }
});

stream.on('error', function (error) {
    throw error;
});