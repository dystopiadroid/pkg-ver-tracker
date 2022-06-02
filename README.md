
# Dyte-Task (pkg-ver-tracker)

#### *-------------------------------------Edit : Now available on npm registry ----------------------------------------------*

CLI tool to verify/update the current version of a dependency used in a public/private github repository mentioned in a CSV file


## Basic Usage

 **https://www.npmjs.com/package/pkg-ver-tracker**

**1) To compare install the cli tool**

```bash
  npx pkg-ver-tracker 
```

**2) To compare the version of dependency in the repository with respect to the specified dependency in the argument.** 

```bash
  npx pkg-ver-tracker -i <CSV-file> <dep@version>
```

**3) Steps to generate personal access token from github :**

      a) Click on your profile and go to settings.

      b) In the left sidebar click on developer settings.

      c) Select personal access tokens.

      d) Generate a new token and copy the token ID.


**4) Make sure that you create an environment variable named **MY_API_KEY** that holds the github auth token**

```bash
  export MY_API_KEY=<github-token>
```

**5) To generate pull request for the repositories whose dependency have lower version with respect to the dependency in the argument**

( **Note :** This will only work if you've set **MY_API_KEY** env variable equal to your github Personal access token as mentioned below. ) 

```bash
  npx pkg-ver-tracker -update -i <CSV-file> <dep@version>
```

  ![image](https://user-images.githubusercontent.com/83747415/171467807-ab295c22-3da4-46b6-ab02-7c44a74a6074.png)
  
  ![image](https://user-images.githubusercontent.com/83747415/171468130-8870eb4f-52dc-4a04-b922-d69dbd0312f0.png)
  
  ![image](https://user-images.githubusercontent.com/83747415/171471317-f008feef-6dab-4d2d-bccd-1418aef9295e.png)
  
 **Pull Request :** https://github.com/dyte-in/javascript-sample-app/pull/390 
 
 **NOTE :** My npm publishing got restricted for certain time that's why I was not able to put the pkg-ver-tracker tool here before 11:30 PM. 
 

 
 ## Using my pkg-ver-tracker tool from npm registry
 
  **https://www.npmjs.com/package/pkg-ver-tracker**
 
 ![image](https://user-images.githubusercontent.com/83747415/171484378-3643262e-7de6-411f-8f34-621d67e580ee.png)

 ![image](https://user-images.githubusercontent.com/83747415/171484553-7ba983fb-8364-4b4e-81e6-b0bbc9cc4170.png)

 **Pull Request :** https://github.com/bala2509/Test/pull/21
  
## Github APIs used

#### Create a fork

```
  POST repos/{owner}/{repo}/forks
```

| Parameter | Type     | Description                |
| :-------- | :------- | :------------------------- |
| `owner` | `string` | **Required**. Account owner of repository |
| `repo` | `string` | **Required**. Name of the repository |


#### Get Branches

```
  GET /repos/{owner}/{repo}/branches
```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `owner` | `string` | **Required**. Account owner of repository |
| `repo` | `string` | **Required**. Name of the repository |


#### Create a new branch

```
  POST /repos/{owner}/{repo}/git/refs
```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `owner` | `string` | **Required**. Account owner of repository |
| `repo` | `string` | **Required**. Name of the repository |
| `ref` | `string` | **Required**. Name of fully qualified reference ( ref/heads/featureA )
| `sha` | `string` | **Required**. The SHA1 value for this reference |

#### Get content from repository

```
  GET /repos/{owner}/{repo}/contents/{path}
```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `owner` | `string` | **Required**. Account owner of repository |
| `repo` | `string` | **Required**. Name of the repository |
| `path` | `string` | **Required**. Path parameter |

#### Update content from repository

```
  PUT /repos/{owner}/{repo}/contents/{path}
```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `owner` | `string` | **Required**. Account owner of repository |
| `repo` | `string` | **Required**. Name of the repository |
| `path` | `string` | **Required**. Path parameter |
| `message` | `string` | **Required**. Commit message |
| `committer.name` | `string` | **Required**. Name of the author or committer |
| `committer.email` | `string` | **Required**. Email of the author or committer |
| `content` | `string` | **Required**. THe new files content (base64 encoded) |

#### Create pull request

```
  POST /repos/{owner}/{repo}/pulls
```

| Parameter | Type     | Description                       |
| :-------- | :------- | :-------------------------------- |
| `owner` | `string` | **Required**. Account owner of repository |
| `repo` | `string` | **Required**. Name of the repository |
| `title` | `string` | **Required**. The title of new pull request |
| `body` | `string` | **Required**. Contents of the pull request|
| `head` | `string` | **Required**. The name of the branch where your changes are implemented |
| `base` | `string` | **Required**. The name of the branch you want the changes pulled into |








