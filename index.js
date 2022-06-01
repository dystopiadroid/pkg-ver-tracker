#!/usr/bin/env node

//  importing libraries
const csvParser = require('csv-parser');                  //  parsing contents from the csv file
const fs = require('fs')                                  //  to create read stream to read files 
const {printTable} = require('console-table-printer')     //  print output in tabular form
const {Octokit} = require('octokit');                     //  to use the Github API
const prompt = require('prompt-sync')({ sigint: true })   //  prompt user for input

const {forkRequest, getBranchesRequest, createBranchRequest, 
       getRepoContent, updateRepoContent, createPullRequest} = require('./gitHelperFunctions')

//  global variables used to populate the table
var checkVersiondata = []
var updateVersiondata = []

//  checking whether package version is greater or not
const checkPkgVersion = async (row, pkgName, pkgVersion, updateArg, srcUserDetails) => {
  const { name, repo } = row;
  const repoLink = repo.replace("github", "raw.github");
  const metaData = await fetch(`${repoLink}/main/package.json`).then(res => res.json());
  tabularPrint(name, repo, metaData.dependencies[pkgName].substring(1), metaData.dependencies[pkgName].substring(1) >= pkgVersion);
  
  //  Does not run if -update argument is not provided
  if(updateArg.isPresent()){
    updatePkgVersion(name, repo, metaData.dependencies[pkgName], metaData.dependencies[pkgName].substring(1) >= pkgVersion
    , pkgVersion, pkgName, srcUserDetails)
  }
}

//  printing in tabular form
function tabularPrint(name, repo, version , version_satisfied){
  checkVersiondata.push( {name, repo, version , version_satisfied} )
}

//  updates the package version to the specified version
async function updatePkgVersion(name, repo, version , version_satisfied, pkgVersion, pkgName, srcUserDetails){
  updateVersiondata.push( {name, repo, version : version.substring(1), version_satisfied, 
    update_pr : !version_satisfied ? await pullRequest(repo, version, pkgVersion, pkgName, srcUserDetails) : ""} ) 

    !version_satisfied ? printTable(updateVersiondata) : ""
}

//  calls several Github APIs to perform different operation leading to generation of pull request 
async function pullRequest(repo, version, pkgVersion, pkgName, srcUserDetails){

  const repoLink = repo.replace("github", "raw.github");
  const metaData = await fetch(`${repoLink}/main/package.json`).then(res => res.json());
  metaData.dependencies[pkgName] = `^${pkgVersion}`
  const splitRepo = repo.split('/')
  const [username, repoName] = splitRepo.splice(splitRepo.indexOf("github.com") + 1)

  //  An interaface to use Github APIs
  const octokit = new Octokit({

    //  github auth token should be stored in a env variable names as 'MY_API_KEY'
    auth: process.env.MY_API_KEY  

  })

  //  fork -> create new branch -> update contents and commit -> generate pull request
  await forkRequest(srcUserDetails, username, repoName, octokit)
  const branch_SHA_ID = await getBranchesRequest(srcUserDetails, repoName, octokit, pkgName)
  await createBranchRequest(srcUserDetails, repoName, octokit, pkgName, branch_SHA_ID)
  const JSON_SHA_ID = await getRepoContent(srcUserDetails, repoName, octokit)
  await updateRepoContent(srcUserDetails, repoName, octokit, metaData, JSON_SHA_ID, version, pkgVersion, pkgName)
  const pr = await createPullRequest(username, srcUserDetails, repoName, octokit, pkgName, version, pkgVersion)

  return pr
}

function main() { 

  const cmd = {
    i : "pkg-version-tracker -i <CSV-file> <depName@minVersion>",
    update : "pkg-version-tracker -update -i <CSV-file> <depName@minVersion>"
  }

  //  error handling for cmd args
  if (!(process.argv.indexOf("-i")+1)) 
  { 
    console.log(`Usage: ${cmd.i}`); 
    return;
  }

  //  parsing all the details from cmd args
  const [fileName, pkgDetails] = (process.argv.splice(process.argv.indexOf("-i") + 1))
  const [pkgName, pkgVersion] = pkgDetails.split("@");

  //  tracking the -update argument
  const updateArg = {
    index : process.argv.indexOf("-i") - 1 ,
    isPresent : function isPresent(){ return (process.argv[this.index] == "-update") ? true : false } ,
    onError : () => {console.log(`Usage: ${cmd.update}`)}
  }

  //  initializing user details for further git related operations
    const srcUserDetails = {
    srcUsername : updateArg.isPresent() ? prompt("Enter your github username : ") : null,
    fullname : updateArg.isPresent() ? prompt("Enter your full name : ") : null,
    email : updateArg.isPresent() ? prompt("Enter your email linked with Github : ") : null
    }

  //  opens a readable stream to get contents from CSV file
  fs.createReadStream(fileName)
    .on("error", () => { console.log(`Error reading from ${fileName}`) })
    .pipe(csvParser({ demiliter: ",", from_line: 1 }))
    .on("data", 
    (row) => checkPkgVersion(row, pkgName, pkgVersion, updateArg, srcUserDetails)     //  fetching each row
    )

  //  printing the version_satisfied table after info has been fetched
  setTimeout(() => {
    printTable(checkVersiondata)
  }, [4000])

}

main();

module.exports = main