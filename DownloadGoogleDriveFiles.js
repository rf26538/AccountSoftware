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

        googleDrive.showFileDownloadSummary(downloadedFile);

        this.fileSummaryByMonths(googleDrive.successfullFileDownloads);



        process.exit();
    }

    fileSummaryByMonths(files)
    {
        if (files.length)
        {
            let filesByMonth = {};

            files.forEach(file => {
                let time = file.createdTime;
                let a = new Date(time);
                let year = a.getFullYear();
                let month = a.getMonth();
                let shortMonth = a.toLocaleString('en-us', { month: 'short' });
                let ts =  shortMonth + ' ' + year;

                if (!filesByMonth[ts])
                {
                    filesByMonth[ts] = [];
                }

                filesByMonth[ts].push({
                    name: file.name,
                    createdTime: file.createdTime
                });
            });

            console.log('\n')
            console.log("File summary by month :-");
            if (filesByMonth)
            {
                for(let i in filesByMonth)
                {
                    let filesInMonth = filesByMonth[i];
                
                    console.log(i);
                    console.table(filesInMonth);
                }

            }
        }

    }
}

let baseDirPath = 'Folder1/Folder2/Invoices';
let startDate = "2021/01/10"; // yyyy/mm/dd
let endDate = "2021/09/22"; // yyyy/mm/dd

let downloadGoogleDriveFiles = new DownloadGoogleDriveFiles();

(async() => {
    await downloadGoogleDriveFiles.init(baseDirPath, startDate, endDate);
})();
