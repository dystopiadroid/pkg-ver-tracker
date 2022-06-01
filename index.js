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
    update_pr : !version_satisfied ? await pullRequest(name, repo, version, pkgVersion, pkgName, srcUserDetails) : ""} ) 

    !version_satisfied ? printTable(updateVersiondata) : ""
}
async function pullRequest(name, repo, version, pkgVersion, pkgName, srcUserDetails){

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

async function forkRequest(srcUserDetails, username, repoName, octokit){

  const response = await octokit.request(`POST /repos/${username}/${repoName}/forks`, {
    owner: srcUserDetails.srcUsername,
    repo: repoName
  })

  console.log(`Sucessfully forked ${repoName}`)
}

async function getBranchesRequest(srcUserDetails, repoName, octokit, pkgName){

  const response = await octokit.request(`GET /repos/${srcUserDetails.srcUsername}/${repoName}/branches`, {
    owner: srcUserDetails.srcUsername ,
    repo: repoName
  })

  return (response.data[0].commit["sha"])

}

async function createBranchRequest(srcUserDetails, repoName, octokit, branchName, branch_SHA_ID){

  const response = await octokit.request(`POST /repos/${srcUserDetails.srcUsername}/${repoName}/git/refs`, {
    owner: srcUserDetails.srcUsername,
    repo: repoName,
    ref: `refs/heads/${branchName}`,
    sha: branch_SHA_ID
  })

  console.log(`Created a new branch named ${branchName} in the forked repo ${repoName}`)

}

async function getRepoContent(srcUserDetails, repoName, octokit){

  const response = await octokit.request(`GET /repos/${srcUserDetails.srcUsername}/${repoName}/contents/package.json`, {
    owner: srcUserDetails.srcUsername,
    repo: repoName,
    path: 'package.json',
  })

  return response.data.sha

}

async function updateRepoContent(srcUserDetails, repoName, octokit, metaData, JSON_SHA_ID, version, pkgVersion, pkgName){

  const metaDataStr = JSON.stringify(metaData)
  const metaDataB64 = Buffer.from(metaDataStr).toString("base64")
  const response = await octokit.request(`PUT /repos/${srcUserDetails.srcUsername}/${repoName}/contents/package.json`, {
    owner: srcUserDetails.srcUsername,
    repo: repoName,
    path: 'package.json',
    branch: pkgName,
    message : `Updates the version of axios from ${version.substring(1)} to ${pkgVersion}`,
    committer: {
      name: srcUserDetails.fullname,
      email: srcUserDetails.email
    },
    content: metaDataB64,
    sha : JSON_SHA_ID
  })

  console.log(`Updated the ${pkgName} dependency in package.json from ${version.substring(1)} --> ${pkgVersion}`)

}

async function createPullRequest(username, srcUserDetails, repoName, octokit, pkgName, version, pkgVersion){

  const response = await octokit.request(`POST /repos/${username}/${repoName}/pulls`, {
    owner: srcUserDetails.srcUsername,
    repo: repoName,
    title: `chore: updates ${pkgName} to ${pkgVersion}`,
    body: `Updates the version of ${pkgName} from ${version.substring(1)} to ${pkgVersion}`,
    head: `${srcUserDetails.srcUsername}:${pkgName}`,
    base: 'main'
  })

  console.log("Successfully generated the pull request")
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