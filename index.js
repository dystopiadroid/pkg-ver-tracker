#!/usr/bin/env node

function main() { 
  if (!(process.argv.indexOf("-i")+1)) 
  { 
    console.log("Usage: node . -i <CSV-file> <depName@version>"); 
    return;
  }
  const [fileName, pkgDetails] = (process.argv.splice(process.argv.indexOf("-i") + 1))
  const [pkgName, pkgVersion] = pkgDetails.split("@");

}

main();

module.exports = main