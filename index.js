#!/usr/bin/env node

// importing libraries
const csvParser = require('csv-parser');
const fs = require('fs')
const {printTable} = require('console-table-printer')

// global variables
var checkVersiondata = []
var updateVersiondata = []

const checkPkgVersion = async (row, pkgName, pkgVersion, updateArg) => {
  const { name, repo } = row;
  const repoLink = repo.replace("github", "raw.github");
  const metaData = await fetch(`${repoLink}/main/package.json`).then(res => res.json());
  tabularPrint(name, repo, metaData.dependencies[pkgName], metaData.dependencies[pkgName].substring(1) >= pkgVersion);
  
  if(updateArg.isPresent()){
    updatePkgVersion(name, repo, metaData.dependencies[pkgName], metaData.dependencies[pkgName].substring(1) >= pkgVersion)
  }
}


function tabularPrint(name, repo, version , version_satisfied){
  checkVersiondata.push( {name, repo, version , version_satisfied} )
}

function updatePkgVersion(name, repo, version , version_satisfied){
  updateVersiondata.push( {name, repo, version, version_satisfied, update_pr : !version_satisfied ? "PR" : ""} ) 
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
  printTable(updateVersiondata)
}, [2000])

}

main();

module.exports = main