const { randomInt } = require('crypto');
const express = require('express');

const {GoogleGenAI} = require("@google/genai");

const {readFile, writeFile} = require("fs/promises");

const router = express.Router();

const ai = new GoogleGenAI();

const katex = require("katex");

const path = require("path");

const filePath = path.join(process.cwd(), "server", "config", "database.json");

const tempFilePath = path.join(process.cwd(), "tmp", "database.json");

async function readJSONFile(filePath)
{
    try
    {
        const rawData = await readFile(filePath, "utf8");

        const jsonObject = JSON.parse(rawData);

        return jsonObject;
    }

    catch (error)
    {
        console.log("error reading file", error, "\n");
    }
}

async function writeJSONFile(filePath, jsonObject)
{
    try
    {
        await writeFile(tempFilePath, JSON.stringify(jsonObject), "utf8");
    }

    catch (error)
    {
        console.log("error writing file", error);
    }
}

router.get('/', (req, res) => {

    readJSONFile(filePath).then( (theJson) => {

        res.render("index.ejs", {studyPlanner: theJson["studyPlanner"], tracker: theJson["tracker"], 
            weak: theJson["weak"], quotes: theJson["quotes"], msgs: theJson["msgs"], messageFailed: false});

    });

});

router.post('/', async function(req, res) {

    readJSONFile(tempFilePath).then( (theJson) => {

        const { requestType, topicName, noQuestions, 
            estTime, logData, weakName, priority, 
            quote, quoteRemoveId, msg } = req.body;

        if (requestType === "add-to-study-planner")
        {
            theJson["studyPlanner"].push({id: randomInt(100000), topicName: topicName, noQuestions: parseInt(noQuestions), estTime: parseInt(estTime)});
        }

        else if (requestType === "add-to-tracker")
        {
            const trackerLast = theJson["tracker"][theJson["tracker"].length - 1];

            if (trackerLast)
            { 
                const lastDate = new Date(trackerLast["date"]).toISOString().slice(1, 10);

                const todaysDate = new Date(Date.now()).toISOString().slice(1, 10);

                console.log(todaysDate);

                if (lastDate != todaysDate)
                {
                    theJson["tracker"].push({"date": Date.now(), "content": []});
                }  
            }  
            
            else
            {
                theJson["tracker"].push({"date": Date.now(), "content": []});
            }

            const parsedLogData = JSON.parse(logData);
            
            theJson["tracker"][theJson["tracker"].length - 1]["content"].push(parsedLogData);   

            if (parseInt(parsedLogData["id"]) <= 100000)
                theJson["studyPlanner"] = theJson["studyPlanner"].filter(obj => obj.id !== parseInt(parsedLogData["id"]));   
            
            else theJson["weak"] = theJson["weak"].filter(obj => obj.id !== parseInt(parsedLogData["id"]));
        }

        else if (requestType === "add-to-weak-areas")
        {
            theJson["weak"].push({id: randomInt(100001, 200000), name: weakName, priority: priority});
        }

        else if (requestType == "add-to-quotes")
        {
            theJson["quotes"].push({id: randomInt(100000), quote: quote});
        }

        else if (requestType == "remove-from-quotes")
        {
            theJson["quotes"] = theJson["quotes"].filter((quote) => quote.id != quoteRemoveId);
        }

        else if (requestType == "send-to-ai")
        {
            return ai.chats.create({model: "gemini-3.1-flash-lite", history: theJson["msgs"]})
            .sendMessage({message: `Answer the question clearly. Bolden out the formulae. Do not use latex (and dont mention u r using latex) Message: ${msg}`})
            .then((resp) => {

                console.log("finished");
                
                theJson["msgs"].push({role: "user", parts: [{text: msg}]} );

                theJson["msgs"].push({role: "model", parts: [{text: resp.text}]});

                writeJSONFile(filePath, theJson);

                res.render("index.ejs", {studyPlanner: theJson["studyPlanner"], tracker: theJson["tracker"], 
                    weak: theJson["weak"], quotes: theJson["quotes"], msgs: theJson["msgs"], messageFailed: false});

            }).catch((error) => {

                console.log(error);

                res.status(500).render("index.ejs", {studyPlanner: theJson["studyPlanner"], tracker: theJson["tracker"], 
                    weak: theJson["weak"], quotes: theJson["quotes"], msgs: theJson["msgs"], messageFailed: true});
            });
        }

        else if (requestType == "clear-chat")
        {
            theJson["msgs"] = [];
        }

        else if (requestType == "clear-tracker")
        {
            theJson["tracker"] = [];
        }

        

        writeJSONFile(filePath, theJson);

        res.render("index.ejs", {studyPlanner: theJson["studyPlanner"], tracker: theJson["tracker"], 
            weak: theJson["weak"], quotes: theJson["quotes"], msgs: theJson["msgs"], messageFailed: false});
        
    });

});

router.get("/about", (req, res) => {

    res.render("about.ejs");
    
});

router.get("/send-feedback", (req, res) => {

    return res.redirect("https://docs.google.com/forms/d/e/1FAIpQLSdsbxhhxPSr3iGRTPKUiQbeikx9FlxUWJWNQoDEWe5yduptow/viewform?usp=publish-editor");
});

module.exports = router;
