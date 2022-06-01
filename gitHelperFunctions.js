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

    module.exports = {forkRequest, getBranchesRequest, createBranchRequest, getRepoContent, 
                      updateRepoContent, createPullRequest}