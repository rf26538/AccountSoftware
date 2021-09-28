const GoogleDriveAuth = require("./GoogleDriveAuth");
const log = require("./Logger.js");
const { DOWNLOAD_FOLDER_PATH } = require("./Constants.js");
const fs = require("fs");

class GoogleDrive {
  successfullFileDownloads = [];
  failedFileDownloads = [];

  async googleDriveAuth() {
    try {
      let googleDriveAuthObj = new GoogleDriveAuth();
      let googleDriveAuth = await googleDriveAuthObj.getGoogleDriveAuth();

      return googleDriveAuth;
    } catch (e) {
      log.error(
        "Error found in GoogleDrive.googleDriveAuth message is " + e.message
      );
      process.exit();
    }
  }

  async getBaseDirFolderIdFromFolderPath(baseDirectoryPath) {
    try {
      if (
        typeof baseDirectoryPath == "undefined" ||
        baseDirectoryPath.length == 0
      ) {
        throw new Error("Folder path can not be empty");
      }

      console.log(
        "Finding base folder id from this path: %s /n/n",
        baseDirectoryPath
      );

      let baseDirNames = baseDirectoryPath.split("/");

      let counter = 0;
      let lastParentDirectoryFolderId = "";

      for (const dirName of baseDirNames) {
        let parentDirectoryFolderId =
          counter == 0 ? "root" : lastParentDirectoryFolderId;

        if (parentDirectoryFolderId) {
          console.log(
            "Finding folder id for %s, Inside folder id: %s",
            dirName,
            parentDirectoryFolderId
          );

          let folderDirectories = await this.getFoldersFromFolderId(
            parentDirectoryFolderId
          );

          if (folderDirectories.length > 0) {
            let directoryInfo = folderDirectories.filter(function (row) {
              return row.name == dirName;
            });

            if (directoryInfo.length > 0) {
              lastParentDirectoryFolderId = directoryInfo[0].id;
            }
          }
        } else {
          console.log("ParentDirFolderId is not found\n");
        }

        counter++;
      }

      return lastParentDirectoryFolderId;
    } catch (e) {
      log.error(
        "Error found in GoogleDrive.getBaseDirFolderIdFromFolderPath error is " +
          e.message
      );
    }
  }

  async getFoldersFromFolderId(folderId) {
    try {
      if (folderId == "") {
        throw new Error("FolderId can not be empty");
      }

      console.log("\nFinding directories from folderId: %s", folderId);

      const drive = await this.googleDriveAuth();

      const result = await Promise.resolve(
        drive.files.list({
          q:
            "mimeType = 'application/vnd.google-apps.folder' and ('" +
            folderId +
            "' in parents) and trashed = false",
          spaces: "drive",
          fields: "nextPageToken, files(id, name, createdTime, parents)",
        })
      );

      return result.data.files || [];
    } catch (e) {
      log.error(
        "Error found in GoogleDrive.getFoldersFromFolderId error is " +
          e.message
      );
      process.exit();
    }
  }

  async getFilesFromFolderId(folderId) {
    try {
      console.log("\nFinding files from folderId: %s", folderId);

      const drive = await this.googleDriveAuth();

      const result = await drive.files.list({
        q: "('" + folderId + "' in parents) and trashed = false",
        spaces: "drive",
        fields:
          "nextPageToken, files(id, name, createdTime, parents, mimeType)",
      });

      return result.data.files || [];
    } catch (error) {
      let message =
        "Error found in GoogleDrive.getFilesFromFolderId error is " +
        error.message;
      log.error(message);
      process.exit();
    }
  }

  async getAllFoldersFromFolderIdRecursively(folderId) {
    // Will return the list of all the folder inside the folderId
    try {
      if (typeof folderId == "undefined" || folderId.length == 0) {
        throw new Error("Folder id cannot be empty.");
      }

      if (folderId) {
        let allFolders = await this.getFoldersFromFolderId(folderId);

        allFolders.forEach((row, rowIndex) => {
          allFolders[rowIndex].isScannedForFolders = false;
          allFolders[rowIndex].isScannedForFiles = false;
        });

        let areAllFoldersScanned = false;

        while (!areAllFoldersScanned) {
          let copyOfAllFolders = [...allFolders];
          let allFoldersScanned = true;

          if (copyOfAllFolders) {
            for (const [
              oneFolderIndex,
              oneFolder,
            ] of copyOfAllFolders.entries()) {
              if (!oneFolder.isScannedForFolders) {
                let subFolders = await this.getFoldersFromFolderId(
                  oneFolder.id
                );
                if (subFolders.length > 0) {
                  allFoldersScanned = false;
                  subFolders.forEach((subFolder) => {
                    allFolders.push({
                      ...subFolder,
                      isScannedForFiles: false,
                      isScannedForFolders: false,
                    });
                  });
                }

                copyOfAllFolders[oneFolderIndex].isScannedForFolders = true;
              }
            }
          }

          areAllFoldersScanned = allFoldersScanned;
        }

        console.log(
          "\nTotal %s folders found %s.\n",
          allFolders.length,
          JSON.stringify(allFolders, undefined, 2)
        );

        return allFolders;
      }

      return [];
    } catch (error) {
      let message =
        "Error found in GoogleDrive.getAllFoldersFromFolderIdRecursively error is " +
        error.message;
      log.error(message);
      process.exit();
    }
  }

  async getAllFilesFromFolders(
    folders // Not needed we can keep this where we use the class
  ) {
    try {
      if (typeof folders == "undefined" || folders.length == 0) {
        throw new Error("Folders can not be empty.");
      }

      let allFiles = [];

      console.log("Finding files from folders");

      if (folders && folders.length > 0) {
        for (const [folderIndex, folder] of folders.entries()) {
          let files = await this.getFilesFromFolderId(folder.id);

          if (files && files.length > 0) {
            files.forEach((file) => {
              if (file.mimeType != "application/vnd.google-apps.folder") {
                file.folderName = folder.name;
                allFiles.push(file);
              }
            });
          }

          folders[folderIndex].isScannedForFiles = true;
        }
      }

      console.log(
        "\nTotal %s files found %s.\n",
        allFiles.length,
        JSON.stringify(allFiles, undefined, 2)
      );

      return allFiles;
    } catch (error) {
      let message =
        "Error found in GoogleDrive.getAllFilesFromFolders error is " +
        error.message;
      log.error(message);
      process.exit();
    }
  }

  getFilesFromDateRange(allFiles, startDate, endDate) {
    try {
      if (typeof allFiles == "undefined" || allFiles.length == 0) {
        throw new Error("Files can not be empty.");
      }

      if (typeof startDate == "undefined" || startDate.length == 0) {
        throw new Error("startDate can not be empty.");
      }

      if (typeof endDate == "undefined" || endDate.length == 0) {
        throw new Error("endDate can not be empty.");
      }

      let filteredFiles = allFiles.filter((singleFile) => {
        let startDateTimestamp = Date.parse(startDate);
        let endDateTimestamp = Date.parse(endDate) + 86399 * 1000;
        let getDateFromJSON = new Date(singleFile.createdTime);

        let fileCreatedTimestamp = Date.parse(getDateFromJSON);

        if (
          fileCreatedTimestamp >= startDateTimestamp &&
          fileCreatedTimestamp <= endDateTimestamp
        ) {
          return true;
        }

        return false;
      });

      console.log(
        "Total filtered files: %s %s",
        filteredFiles.length,
        JSON.stringify(filteredFiles, undefined, 2)
      );

      return filteredFiles;
    } catch (error) {
      let message =
        "Error found in GoogleDrive.getFilesFromDateRange error is " +
        error.message;
      log.error(message);
      process.exit();
    }
  }

  createFolder() {
    try {
      const dir = "./Downloads";
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
        console.log("Folder created succesfully");
      } else {
        console.log("Downloads folder already exist");
      }
    } catch (error) {
      let message = "Error found in createFolder error is " + error.message;
      log.error(message);
      process.exit();
    }
  }

  async downloadFiles(filteredFiles) {
    try {
      if (typeof filteredFiles == "undefined" || filteredFiles.length == 0) {
        throw new Error("Filtered files can not be empty");
      }

      for (const file of filteredFiles) {
        try {
          await this.downloadGoogleFile(file);
          this.successfullFileDownloads.push(file.name);
        } catch (error) {
          this.failedFileDownloads.push(file.name);
          log.error(error.message);
        }
      }
    } catch (error) {
      let message =
        "Error found in GoogleDrive.downloadFilesInRange error is " +
        error.message;
      log.error(message);
      process.exit();
    }
  }

  async downloadGoogleFile({
    name: fileName,
    id: fileId,
    mimeType: filemimeType,
  }) {
    try {
      if (typeof fileId == "undefined" || fileId.length == 0) {
        throw new Error("fileId can not be empty");
      }

      if (typeof fileName == "undefined" || fileName.length == 0) {
        throw new Error("fileName can not be empty");
      }

      let drive = await this.googleDriveAuth();
      let downloadFilePath = DOWNLOAD_FOLDER_PATH + "/" + fileName;

      console.log("Downloading file ", fileName);
      let ref = this;

      return new Promise(function (resolve, reject) {
        drive.files.get(
          {
            fileId: fileId,
            alt: "media",
            // mimeType: filemimeType
          },
          { responseType: "arraybuffer" || "stream" },
          function (err, res) {
            if (err) {
              let arrBufferToStr = ref.getStringFromArrayBuffer(err.message);
              let message =
                `${fileName} is not downlodable: ` +
                  arrBufferToStr?.error?.message || "";
              return reject(new Error(message));
            }

            const { data } = res;

            if (data) {
              fs.writeFile(downloadFilePath, Buffer.from(data), (err) => {
                if (err) {
                  let arrBufferToStr = ref.getStringFromArrayBuffer(
                    err.message
                  );
                  let message =
                    `${fileName} file can not be downloaded. Message is: ` +
                      arrBufferToStr?.error?.message || "";
                  return reject(new Error(message));
                }

                return resolve();
              });
            }
          }
        );
      });
    } catch (error) {
      let message =
        "Error found in GoogleDrive.downloadGoogleFile error is " +
        error.message;
      log.error(message);
    }
  }

  getStringFromArrayBuffer(arrBuffer) {
    try {
      if (typeof arrBuffer == "string") {
        return arrBuffer;
      } else {
        let str = JSON.parse(
          String.fromCharCode.apply(String, new Uint8Array(arrBuffer))
        );
        return str;
      }
    } catch (error) {
      log.error(error.message);
      return "";
    }
  }

  showFileDownloadSummary() {
    try {
      if (this.successfullFileDownloads.length > 0) {
        console.log("---------------------------------------------------");
        console.log(
          "Total successfull file downloaded count ",
          this.successfullFileDownloads.length
        );
        let fileNames = this.successfullFileDownloads;
        fileNames.forEach((fileNames) => {
          console.log(fileNames);
        });
      }

      if (this.failedFileDownloads.length > 0) {
        console.log("---------------------------------------------------");
        console.log(
          "Total failed file download count ",
          this.failedFileDownloads.length
        );
        let fileNames = this.failedFileDownloads;
        fileNames.forEach((fileNames) => {
          console.log(fileNames);
        });
      }
    } catch (error) {
      let message ="Error found in showFileDownloadSummary message is " + error.message;
      log.error(message);
      process.exit();
    }
  }
}

module.exports = GoogleDrive;
