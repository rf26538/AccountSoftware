const GoogleDrive = require("./GoogleDrive.js");

class DownloadGoogleDriveFiles 
{
    async init(baseDirPath, startDate, endDate)
    {
        let googleDrive = new GoogleDrive;

        let basePathFolderId = await googleDrive.getBaseDirFolderIdFromFolderPath(baseDirPath);

        if(basePathFolderId){
            googleDrive.createFolder();
        }

        let allFolders = await googleDrive.getAllFoldersFromFolderIdRecursively(basePathFolderId);

        let allFiles = await googleDrive.getAllFilesFromFolders(allFolders);

        let filteredFiles = googleDrive.getFilesFromDateRange(allFiles, startDate, endDate);

        let downloadedFile = await googleDrive.downloadFiles(filteredFiles);

        googleDrive.showFileDownloadSummary();

        process.exit();
    }
}

let baseDirPath = 'Folder1/Folder2/Invoices';
let startDate = "2021/01/10"; // yyyy/mm/dd
let endDate = "2021/09/22"; // yyyy/mm/dd

let downloadGoogleDriveFiles = new DownloadGoogleDriveFiles();

(async() => {
    await downloadGoogleDriveFiles.init(baseDirPath, startDate, endDate);
})();
