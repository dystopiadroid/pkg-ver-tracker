  //  ----------------------  Using Github API with the help of Octokit  -------------------------------------------

const {Octokit} = require('octokit');                     //  to use the Github API
  //  An interaface to use Github APIs
  const octokit = new Octokit({
    //  github auth token should be stored in a env variable names as 'MY_API_KEY'
    auth: process.env.MY_API_KEY  
  })

  async function retryMethod(method, params, retries) {
    return await method(...params).catch(err => {
      if (retries > 0) 
        retryMethod(method, params, retries - 1)
      else
        console.log(`Failed after retires`)
    }) 
  }

  //  creating a fork of the specificied repo
  /**
   * Forks a specified repository
   * @srcUserDetails string
   * @username string
   * @repoName string
   * @octokit string
   * @return success/error status of the operation
   */
  async function forkRequest(srcUserDetails, username, repoName){
    const response = await octokit.request(`POST /repos/${username}/${repoName}/forks`, {
      owner: srcUserDetails.srcUsername,
      repo: repoName
    });
    return true;
  }
    
    //  fetching the SHA_ID of existing branches in order to create a new brach
    async function getBranchesRequest(srcUserDetails, repoName, pkgName){
      const response = await octokit.request(`GET /repos/${srcUserDetails.srcUsername}/${repoName}/branches`, {
        owner: srcUserDetails.srcUsername ,
        repo: repoName
      }).catch(err => console.log("@getMasterSHA",{err}))
    
      return (response.data[0].commit["sha"])
    }

    //  using refs to create a new branch with the same name as the dep which needs to be updated 
    async function createBranchRequest(srcUserDetails, repoName, branchName, branch_SHA_ID){
    

      const response = await octokit.request(`POST /repos/${srcUserDetails.srcUsername}/${repoName}/git/refs`, {
        owner: srcUserDetails.srcUsername,
        repo: repoName,
        ref: `refs/heads/${branchName}`,
        sha: branch_SHA_ID
      }).then(() => 
      console.log(`Created a new branch named ${branchName} in the forked repo ${repoName}`)
      ).catch((err) => console.log({err}))
    
      return true;
    
    }
    
    //  fetching the package.json contents (default : base64 encoded)
    async function getRepoContent(srcUserDetails, repoName, octokit){
    
      const response = await octokit.request(`GET /repos/${srcUserDetails.srcUsername}/${repoName}/contents/package.json`, {
        owner: srcUserDetails.srcUsername,
        repo: repoName,
        path: 'package.json',
      })
    
      return response.data.sha
    
    }
    
    //  changing the package.jsom contents and updating it in the same base64 format 
    async function updateRepoContent(srcUserDetails, repoName, metaData, JSON_SHA_ID, version, pkgVersion, pkgName){
    

      //Encoding to Base64 format
      const metaDataStr = JSON.stringify(metaData)
      const metaDataB64 = Buffer.from(metaDataStr).toString("base64")

      const response = await octokit.request(`PUT /repos/${srcUserDetails.srcUsername}/${repoName}/contents/package.json`, {
        owner: srcUserDetails.srcUsername,
        repo: repoName,
        path: 'package.json',
        branch: pkgName,
        message : `Updates the version of axios from ${version.substring(1)} to ${pkgVersion}`,     //  commit message
        committer: {
          name: srcUserDetails.fullname,
          email: srcUserDetails.email
        },
        content: metaDataB64,
        sha : JSON_SHA_ID
      })
    
      console.log(`Updated the ${pkgName} dependency in package.json from ${version.substring(1)} --> ${pkgVersion}`)
      return true;
    
    }
    
    //  generating the pull request 
    async function createPullRequest(username, srcUserDetails, repoName, pkgName, version, pkgVersion, branchToggle){

      const response = await octokit.request(`POST /repos/${username}/${repoName}/pulls`, {
        owner: srcUserDetails.srcUsername,
        repo: repoName,
        title: `chore: updates ${pkgName} to ${pkgVersion}`,
        body: `Updates the version of ${pkgName} from ${version.substring(1)} to ${pkgVersion}`,
        head: `${srcUserDetails.srcUsername}:${pkgName}`,
        base: branchToggle
      })
    
      console.log("Successfully generated the pull request")

      //  returning the pr link to the table
      return response.data.html_url  
    
    }

    module.exports = {retryMethod, forkRequest, getBranchesRequest, createBranchRequest, getRepoContent, 
                      updateRepoContent, createPullRequest}