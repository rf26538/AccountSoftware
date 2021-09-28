const logger = require("./Logger.js");
const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/drive'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'Token.json';
const credentialFileName = 'Credential.json';

if (fs.existsSync(credentialFileName)) {
    authToken = fs.readFileSync(credentialFileName);
    authToken = JSON.parse(authToken);

    authorize(authToken, async function(auth) {
        init(auth);
    });
} else {
    console.log('Error loading client secret file');
    process.exit();
}


/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */

function authorize(credentials, callback) {
    try {
        const { client_secret, client_id, redirect_uris } = credentials.installed;
        const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
    
        // Check if we have previously stored a token.
        fs.readFile(TOKEN_PATH, (err, token) => {
            if (err) return getAccessToken(oAuth2Client, callback);
            oAuth2Client.setCredentials(JSON.parse(token));
            return callback(oAuth2Client);
        });
    } catch (error) {
        let message = "Error found in authorize erro`r is " + error.message;
        logger.error(message);
        process.exit();
    }

}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getAccessToken(oAuth2Client, callback) {
    try{
        const authUrl = oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES,
        });
        console.log('Authorize this app by visiting this url:', authUrl);
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        rl.question('Enter the code from that page here: ', (code) => {
            rl.close();
            oAuth2Client.getToken(code, (err, token) => {
                if (err) return console.error('Error retrieving access token', err);
                oAuth2Client.setCredentials(token);
                // Store the token to disk for later program executions
                fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
                    if (err) return console.error(err);
                    console.log('Token stored to', TOKEN_PATH);
                });
                callback(oAuth2Client);
            });
        });
    } catch (error) {
        let message = "Error found in getAccessToken error is " + error.message;
        logger.error(message);
        process.exit();
    }

}


const baseDirectoryPath = "Folder1/Folder2/Invoices";
const startDate = "2021/07/10";
const endDate = "2021/07/16";

// Make a function to get all directories from a folder id
// folder id: 

async function getFoldersFromFolderId(auth, folderId) {
    try{
        console.log('\nFinding directories from folderId: %s', folderId);

        const drive = getGoogleDriveAuth(auth);

        console.log(drive);
        process.exit();
        // console.log("mimeType = 'application/vnd.google-apps.folder', '" + folderId + "' in parents");
    
        const result = await drive.files.list({
            q: "mimeType = 'application/vnd.google-apps.folder' and ('" + folderId + "' in parents) and trashed = false",
            spaces: "drive",
            fields: 'nextPageToken, files(id, name, createdTime, parents)',
        });
    
        return result.data.files || [];
    } catch(error){
        let message = "Error found in getFoldersFromFolderId error is " + error.message;

        logger.error(message);
        process.exit();
    }

}

async function getFilesFromFolderId(auth, folderId) {
    try{
        console.log('\nFinding files from folderId: %s', folderId);

        const drive = getGoogleDriveAuth(auth);
    
        const result = await drive.files.list({
            q: "('" + folderId + "' in parents) and trashed = false",
            spaces: "drive",
            fields: 'nextPageToken, files(id, name, createdTime, parents, mimeType)',
        });
    
        return result.data.files || [];
    } catch(error) {
        let message = "Error found in getFilesFromFolderId error is " + error.message;
        logger.error(message);
        // console.log("Error found in getFilesFromFolderId error is %s", error.message);
        process.exit();
    }

}

/**
 * Lists the names and IDs of up to 10 files.
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function getGoogleDriveAuth(auth) {
    try {
        return google.drive({ version: 'v3', auth });
    } catch (error) {
        let message = "Error found in getGoogleDriveAuth error is " + error.message;
        logger.error(message);
        process.exit();
    }
   
}

async function getBaseDirFolderId(auth) {
    try {
        console.log('Finding base folder id from this path: %s /n/n', baseDirectoryPath);

        let baseDirNames = baseDirectoryPath.split('/');
    
        let counter = 0;
        let lastParentDirectoryFolderId = '';
    
        for (const dirName of baseDirNames) {
            let parentDirectoryFolderId = counter == 0 ? 'root' : lastParentDirectoryFolderId;
    
            if (parentDirectoryFolderId) {
                console.log('Finding folder id for %s, Inside folder id: %s', dirName, parentDirectoryFolderId);
    
                let folderDirectories = await getFoldersFromFolderId(auth, parentDirectoryFolderId);
    
                if (folderDirectories.length > 0) {
                    let directoryInfo = folderDirectories.filter(function(row) {
                        return row.name == dirName
                    });
    
                    if (directoryInfo.length > 0) {
                        lastParentDirectoryFolderId = directoryInfo[0].id
                    }
                }
            } else {
                console.log('ParentDirFolderId is not found\n');
            }
    
            counter++
        };
    
        return lastParentDirectoryFolderId;
    } catch (error) {
        let message = "Error found in getBaseDirFolderId error is " + error.message;
        logger.error(message);
        process.exit();
    }

}

async function getAllFoldersRecursively(auth, folderId) {
    try{
        if (folderId) {
            let allFolders = await getFoldersFromFolderId(auth, folderId);
    
            allFolders.forEach((row, rowIndex) => {
                allFolders[rowIndex].isScannedForFolders = false;
                allFolders[rowIndex].isScannedForFiles = false;
            });
    
            let areAllFoldersScanned = false;
    
            while (!areAllFoldersScanned) {
                let copyOfAllFolders = [...allFolders];
                allFoldersScanned = true;
    
                if (copyOfAllFolders) {
                    for (const [oneFolderIndex, oneFolder] of copyOfAllFolders.entries()) {
                        if (!oneFolder.isScannedForFolders) {
                            let subFolders = await getFoldersFromFolderId(auth, oneFolder.id);
                            if (subFolders.length > 0) {
                                allFoldersScanned = false;
                                subFolders.forEach(subFolder => {
                                    allFolders.push({...subFolder, isScannedForFiles: false, isScannedForFolders: false });
                                });
                            }
    
                            copyOfAllFolders[oneFolderIndex].isScannedForFolders = true;
                        }
                    }
                }
    
                areAllFoldersScanned = allFoldersScanned;
            }
    
            console.log('\nTotal %s folders found %s.\n', allFolders.length, JSON.stringify(allFolders, undefined, 2));
    
            return allFolders;
        }
    
        return [];
    } catch(error){
        let message = "Error found in getAllFoldersRecursively error is " + error.message;
        logger.error(message);
        process.exit();
    }

}

async function getAllFilesFromFolders(auth, folders) {
    try {
        let allFiles = [];

        console.log('Finding files from folders');

        if (folders && folders.length > 0) {
            for (const [folderIndex, folder] of folders.entries()) {
                let files = await getFilesFromFolderId(auth, folder.id)

                if (files && files.length > 0) {
                    files.forEach(file => {
                        if (file.mimeType != 'application/vnd.google-apps.folder') {
                            file.folderName = folder.name;
                            allFiles.push(file);
                        }
                    });
                }

                folders[folderIndex].isScannedForFiles = true;
            }
        }

        console.log('\nTotal %s files found %s.\n', allFiles.length, JSON.stringify(allFiles, undefined, 2));

        return allFiles;
    } catch (error) {
        let message = "Error found in getAllFilesFromFolders error is " + error.message;
        logger.error(message);
        process.exit();
    }
    
}

async function getFilesFromDateRange(allFiles, startDate, endDate) {
    try {
        let filteredFiles = allFiles.filter(singleFile => {

            let startDateTimestamp = Date.parse(startDate);
            let endDateTimestamp = Date.parse(endDate) + 86399 * 1000;
            let getDateFromJSON = new Date(singleFile.createdTime);
    
            let fileCreatedTimestamp = Date.parse(getDateFromJSON);
    
            if (fileCreatedTimestamp >= startDateTimestamp && fileCreatedTimestamp <= endDateTimestamp) {
                return true;
            }
    
            return false;
        });
    
        console.log('Total filtered files: %s %s', filteredFiles.length, JSON.stringify(filteredFiles, undefined, 2));
        // console.log({ filteredFiles });
        return filteredFiles;
    } catch (error) {
        let message = "Error found in getFilesFromDateRange error is " + error.message;
        logger.error(message);
        process.exit();
    }
}

async function downloadFilesInRange(auth, filteredFiles) {
    try {
        let drive = getGoogleDriveAuth(auth);
        let allFiles = filteredFiles;
    
        for (const download of allFiles) {
            console.log('Getting file details form %s', download);
    
            drive.files.get({ fileId: download.id }, (er, re) => {
                if (er) {
                    console.error('Error found file getting file details');
                    return;
                }
                
                    let fileName = download.name;
                    let dest = fs.createWriteStream(__dirname + '/' + fileName); // Modified
                     drive.files.get({ fileId: download.id, alt: "media" }, { responseType: "stream" },
                        function(err, res) {
                            if (err) {
                                console.log('Download Error', err);
                                return;
                            }
    
                            res.data
                                .on('end', () => { // Modified
                                    console.log("Download Successfull");
                                })
                                .on('error', err => {
                                    console.log("Error", err);
                                })
                                .pipe(dest);
                        });        
                
            });
        }
    } catch (error) {
        let message = "Error found in downloadFilesInRange error is " + error.message;
        logger.error(message);
        process.exit();
    } 

}

async function init(auth) {
    try {
        let basePathFolderId = await getBaseDirFolderId(auth);

       

        if (basePathFolderId) {
            let allFolders = await getAllFoldersRecursively(auth, basePathFolderId);
    
            console.log(allFolders)
            if (allFolders.length > 0) {
                // let allFiles = await getAllFilesFromFolders(auth, allFolders);
    
                // let FilteredFiles = await getFilesFromDateRange(allFiles, startDate, endDate);
    
                // let downloadFile = downloadFilesInRange(auth, FilteredFiles);
    
            }
        }
    } catch (error) {
        let message = "Error found in init error is " + error.message;
        // 
        // Helps to print stack trace
        // let message = "Error found in init error is " + error.message + " Stack trace is " + error.stack;
        // 
        logger.error(message);
        process.exit();
    }

}