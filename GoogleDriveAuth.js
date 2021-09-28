const log = require("./Logger.js");
const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');

const {
    TOKEN_FILE_PATH,
    CREDENTIAL_FILE_PATH
} = require('./Constants.js');

class GoogleDriveAuth
{
    async getGoogleDriveAuth()
    {
        try
        {
            let googleAuthClient = await this.googleAuthClient();
            let googleDriveAuth = google.drive({ version: 'v3', auth: googleAuthClient });
            
            return googleDriveAuth;
        }
        catch(e)
        {
            log.error('Error found in GoogleDriveAuth.getGoogleDriveAuth error is ' + e.message);
            process.exit();
        }
    }

    async googleAuthClient()
    {
        let authToken = JSON.parse(this.getAuthToken());
        let googleAuthClient = await this.authorize(authToken);

        return googleAuthClient;
    }

    async authorize(credentials)
    {
        try
        {            
            if (typeof credentials.installed == "undefined")
            {
                throw new Error("Credentials can not be empty.");
            }

            const { client_secret, client_id, redirect_uris } = credentials.installed;
            const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
    
            if (fs.existsSync(TOKEN_FILE_PATH))
            {

                let token = JSON.parse(fs.readFileSync(TOKEN_FILE_PATH));

                oAuth2Client.setCredentials(token);

                return oAuth2Client;
            }
            else
            {
                await this.getAccessToken(oAuth2Client);

                return oAuth2Client;
            }
        }
        catch(e)
        {
            log.error('Error in GoogleDriveAuth.authorize error is ' + e.message);
            process.exit();
        }
    }
    
    async getAccessToken(oAuth2Client) {
        try
        {
            if (oAuth2Client.length == 0)
            {
                throw new Error("oAuth2Client can not be empty.");
            }

            return new Promise(async (resolve, reject) => {
            
                const authUrl = oAuth2Client.generateAuthUrl({
                    access_type: 'offline',
                    scope: ['https://www.googleapis.com/auth/drive'],
                });
                
                console.log('Authorize this app by visiting this url:', authUrl);
        
                let code = await this.ask("Enter the code from that page here: ");
        
                let getOAuth2ClientToken = await oAuth2Client.getToken(code);
                let oAuth2ClientToken = getOAuth2ClientToken.tokens;
                
                fs.writeFileSync(TOKEN_FILE_PATH, JSON.stringify(oAuth2ClientToken));
        
                oAuth2Client.setCredentials(oAuth2ClientToken);

                return resolve(oAuth2Client);
            });
        }
        catch(e)
        {
            log.error('Error found in GoogleDriveAuth.getAccessToken error is ' + e.message);
            process.exit();
        }
    }

    getAuthToken()
    {
        try
        {
            let authToken = fs.readFileSync(CREDENTIAL_FILE_PATH);

            return authToken;
        }
        catch(e)
        {
            log.error('Error found in GoogleDriveAuth.getAuthToken error is ' + e.message);
        }
    }   

    ask(questionText) 
    {
        try
        {
            if (questionText.length == 0)
            {
                throw new Error("Question can not be empty.");
            }
         
            let readlineInterface = readline.createInterface({
                input: process.stdin,
                output: process.stdout,
            });
        
            return new Promise((resolve, reject) => {
                readlineInterface.question(questionText, (input) => resolve(input));
            });
        }
        catch(e)
        {
            log.error('Error found in GoogleDriveAuth.ask error is ' + e.message);
            process.exit();
        }
    }
}


module.exports = GoogleDriveAuth;