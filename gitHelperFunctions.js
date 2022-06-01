  //  ----------------------  Using Github API with the help of Octokit  -------------------------------------------

  //  creating a fork of the specificied repo
  async function forkRequest(srcUserDetails, username, repoName, octokit){

      const response = await octokit.request(`POST /repos/${username}/${repoName}/forks`, {
        owner: srcUserDetails.srcUsername,
        repo: repoName
      })
    
      setTimeout(() => {

      }, [5000])

      console.log(`Sucessfully forked ${repoName}`)

    }
    
    //  fetching the SHA_ID of existing branches in order to create a new brach
    async function getBranchesRequest(srcUserDetails, repoName, octokit, pkgName){
    

      const response = await octokit.request(`GET /repos/${srcUserDetails.srcUsername}/${repoName}/branches`, {
        owner: srcUserDetails.srcUsername ,
        repo: repoName
      })
    
      return (response.data[0].commit["sha"])
    
    }
    
    //  using refs to create a new branch with the same name as the dep which needs to be updated 
    async function createBranchRequest(srcUserDetails, repoName, octokit, branchName, branch_SHA_ID){
    

      const response = await octokit.request(`POST /repos/${srcUserDetails.srcUsername}/${repoName}/git/refs`, {
        owner: srcUserDetails.srcUsername,
        repo: repoName,
        ref: `refs/heads/${branchName}`,
        sha: branch_SHA_ID
      })
    
      console.log(`Created a new branch named ${branchName} in the forked repo ${repoName}`)
    
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
    async function updateRepoContent(srcUserDetails, repoName, octokit, metaData, JSON_SHA_ID, version, pkgVersion, pkgName){
    

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
    
    }
    
    //  generating the pull request 
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

      //  returning the pr link to the table
      return response.data.html_url  
    
    }

    module.exports = {forkRequest, getBranchesRequest, createBranchRequest, getRepoContent, 
                      updateRepoContent, createPullRequest}