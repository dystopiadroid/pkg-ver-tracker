#!/usr/bin/env node

// importing libraries
const csvParser = require('csv-parser');
const fs = require('fs')
const {printTable} = require('console-table-printer')
const {Octokit, App} = require('octokit');
const prompt = require('prompt-sync')({ sigint: true })

// global variables
var checkVersiondata = []
var updateVersiondata = []

const checkPkgVersion = async (row, pkgName, pkgVersion, updateArg) => {
  const { name, repo } = row;
  const repoLink = repo.replace("github", "raw.github");
  const metaData = await fetch(`${repoLink}/main/package.json`).then(res => res.json());
  tabularPrint(name, repo, metaData.dependencies[pkgName].substring(1), metaData.dependencies[pkgName].substring(1) >= pkgVersion);
  
  if(updateArg.isPresent()){
    updatePkgVersion(name, repo, metaData.dependencies[pkgName], metaData.dependencies[pkgName].substring(1) >= pkgVersion
    , pkgVersion, pkgName, updateArg)
  }
}


function tabularPrint(name, repo, version , version_satisfied){
  checkVersiondata.push( {name, repo, version , version_satisfied} )
}

async function updatePkgVersion(name, repo, version , version_satisfied, pkgVersion, pkgName){
  updateVersiondata.push( {name, repo, version : version.substring(1), version_satisfied, 
    update_pr : !version_satisfied ? await pullRequest(name, repo, version, pkgVersion, pkgName) : ""} ) 

    !version_satisfied ? printTable(updateVersiondata) : ""
}
async function pullRequest(name, repo, version, pkgVersion, pkgName){

  const repoLink = repo.replace("github", "raw.github");
  const metaData = await fetch(`${repoLink}/main/package.json`).then(res => res.json());
  metaData.dependencies[pkgName] = `^${pkgVersion}`
  const splitRepo = repo.split('/')
  const [username, repoName] = splitRepo.splice(splitRepo.indexOf("github.com") + 1)
  const srcUsername = prompt("Enter your github username : ")

  const octokit = new Octokit({
    auth: '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'
  })
  await forkRequest(srcUsername, username, repoName, octokit)
  const branch_SHA_ID = await getBranchesRequest(srcUsername, repoName, octokit)
  await createBranchRequest(srcUsername, repoName, octokit, pkgName, branch_SHA_ID)
  const JSON_SHA_ID = await getRepoContent(srcUsername, repoName, octokit)
  await updateRepoContent(srcUsername, repoName, octokit, metaData, JSON_SHA_ID, version, pkgVersion, pkgName)
  const pr = await createPullRequest(username, srcUsername, repoName, octokit, pkgName, version, pkgVersion)


  return pr
}

async function forkRequest(srcUsername, username, repoName, octokit){

  const response = await octokit.request(`POST /repos/${username}/${repoName}/forks`, {
    owner: srcUsername,
    repo: repoName
  })

  // console.log(response)
}

async function getBranchesRequest(srcUsername, repoName, octokit){

  const response = await octokit.request(`GET /repos/${srcUsername}/${repoName}/branches`, {
    owner: srcUsername ,
    repo: repoName
  })

  return (response.data[0].commit["sha"])

}

async function createBranchRequest(srcUsername, repoName, octokit, branchName, branch_SHA_ID){

  const response = await octokit.request(`POST /repos/${srcUsername}/${repoName}/git/refs`, {
    owner: srcUsername,
    repo: repoName,
    ref: `refs/heads/${branchName}`,
    sha: branch_SHA_ID
  })

}

async function getRepoContent(srcUsername, repoName, octokit){

  const response = await octokit.request(`GET /repos/${srcUsername}/${repoName}/contents/package.json`, {
    owner: srcUsername,
    repo: repoName,
    path: 'package.json',
  })

  return response.data.sha

}

async function updateRepoContent(srcUsername, repoName, octokit, metaData, JSON_SHA_ID, version, pkgVersion, pkgName){

  const metaDataStr = JSON.stringify(metaData)
  const metaDataB64 = Buffer.from(metaDataStr).toString("base64")
  const fullname = prompt("Enter your full name : ")
  const email = prompt("Enter your email linked with Github : ")
  const response = await octokit.request(`PUT /repos/dystopiadroid/${repoName}/contents/package.json`, {
    owner: srcUsername,
    repo: repoName,
    path: 'package.json',
    branch: pkgName,
    message : `Updates the version of axios from ${version.substring(1)} to ${pkgVersion}`,
    committer: {
      name: fullname,
      email: email
    },
    content: metaDataB64,
    sha : JSON_SHA_ID
  })

}

async function createPullRequest(username, srcUsername, repoName, octokit, pkgName, version, pkgVersion){

  const response = await octokit.request(`POST /repos/${srcUsername}/${repoName}/pulls`, {
    owner: srcUsername,
    repo: repoName,
    title: `chore: updates ${pkgName} to ${pkgVersion}`,
    body: `Updates the version of ${pkgName} from ${version.substring(1)} to ${pkgVersion}`,
    head: `${srcUsername}:${pkgName}`,
    base: 'main'
  })

  return response.data.html_url  

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

  fs.createReadStream(fileName)
    .on("error", () => { console.log(`Error reading from ${fileName}`) })
    .pipe(csvParser({ demiliter: ",", from_line: 1 }))
    .on("data", (row) =>checkPkgVersion(row, pkgName, pkgVersion, updateArg))

setTimeout(() => {
  printTable(checkVersiondata)
}, [3000])

}

main();

module.exports = main