#!/usr/bin/env node

// importing libraries
const csvParser = require('csv-parser');
const fs = require('fs')
const {printTable} = require('console-table-printer')
const {Octokit} = require('octokit');
const prompt = require('prompt-sync')({ sigint: true })
const {forkRequest, getBranchesRequest, createBranchRequest, 
       getRepoContent, updateRepoContent, createPullRequest} = require('./gitHelperFunctions')

// global variables
var checkVersiondata = []
var updateVersiondata = []

const checkPkgVersion = async (row, pkgName, pkgVersion, updateArg, srcUserDetails) => {
  const { name, repo } = row;
  const repoLink = repo.replace("github", "raw.github");
  const metaData = await fetch(`${repoLink}/main/package.json`).then(res => res.json());
  tabularPrint(name, repo, metaData.dependencies[pkgName].substring(1), metaData.dependencies[pkgName].substring(1) >= pkgVersion);
  
  if(updateArg.isPresent()){
    updatePkgVersion(name, repo, metaData.dependencies[pkgName], metaData.dependencies[pkgName].substring(1) >= pkgVersion
    , pkgVersion, pkgName, srcUserDetails)
  }
}


function tabularPrint(name, repo, version , version_satisfied){
  checkVersiondata.push( {name, repo, version , version_satisfied} )
}

async function updatePkgVersion(name, repo, version , version_satisfied, pkgVersion, pkgName, srcUserDetails){
  updateVersiondata.push( {name, repo, version : version.substring(1), version_satisfied, 
    update_pr : !version_satisfied ? await pullRequest(repo, version, pkgVersion, pkgName, srcUserDetails) : ""} ) 

    !version_satisfied ? printTable(updateVersiondata) : ""
}
async function pullRequest(repo, version, pkgVersion, pkgName, srcUserDetails){

  const repoLink = repo.replace("github", "raw.github");
  const metaData = await fetch(`${repoLink}/main/package.json`).then(res => res.json());
  metaData.dependencies[pkgName] = `^${pkgVersion}`
  const splitRepo = repo.split('/')
  const [username, repoName] = splitRepo.splice(splitRepo.indexOf("github.com") + 1)

  const octokit = new Octokit({
    auth: process.env.MY_API_KEY
  })

  await forkRequest(srcUserDetails, username, repoName, octokit)
  const branch_SHA_ID = await getBranchesRequest(srcUserDetails, repoName, octokit, pkgName)
  await createBranchRequest(srcUserDetails, repoName, octokit, pkgName, branch_SHA_ID)
  const JSON_SHA_ID = await getRepoContent(srcUserDetails, repoName, octokit)
  await updateRepoContent(srcUserDetails, repoName, octokit, metaData, JSON_SHA_ID, version, pkgVersion, pkgName)
  const pr = await createPullRequest(username, srcUserDetails, repoName, octokit, pkgName, version, pkgVersion)


  return pr
}

function main() { 

  if (!(process.argv.indexOf("-i")+1)) 
  { 
    console.log("Usage: node . -i <CSV-file> <depName@minVersion>"); 
    return;
  }
  const [fileName, pkgDetails] = (process.argv.splice(process.argv.indexOf("-i") + 1))
  const [pkgName, pkgVersion] = pkgDetails.split("@");
  const updateArg = {
    index : process.argv.indexOf("-i") - 1 ,
    isPresent : function isPresent(){ return (process.argv[this.index] == "-update") ? true : false } ,
    onError : () => {console.log("Usage: node . -update -i <CSV-file> <depName@minVersion>")}
  }

    const srcUserDetails = {
    srcUsername : updateArg.isPresent() ? prompt("Enter your github username : ") : null,
    fullname : updateArg.isPresent() ? prompt("Enter your full name : ") : null,
    email : updateArg.isPresent() ? prompt("Enter your email linked with Github : ") : null
    }

  fs.createReadStream(fileName)
    .on("error", () => { console.log(`Error reading from ${fileName}`) })
    .pipe(csvParser({ demiliter: ",", from_line: 1 }))
    .on("data", 
    (row) => checkPkgVersion(row, pkgName, pkgVersion, updateArg, srcUserDetails)
    )

setTimeout(() => {
  printTable(checkVersiondata)
}, [4000])

}

main();

module.exports = main