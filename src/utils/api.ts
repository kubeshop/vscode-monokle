import normalizeUrl from 'normalize-url';
import fetch from 'node-fetch';
import { raiseError } from './errors';
import logger from './logger';
import globals from './globals';

type UserProjectRepo = {
  id: string;
  projectId: number;
  provider: string;
  owner: string;
  name: string;
  prChecks: boolean;
  canEnablePrChecks: boolean;
};

type UserProject = {
  id: number;
  slug: string;
  name: string;
  repositories: UserProjectRepo[];
};

type UserData = {
  data: {
    me: {
      id: number;
      email: string;
      projects: [
        {
          project: UserProject
        }
      ]
    }
  }
};

type PolicyData = {
  data: {
    getProject: {
      id: number;
      policy: {
        id: string;
        json: any;
      }
    }
  }
};

const getUserQuery = `
  query getUser {
    me {
      id
      email
      projects {
        project {
          id
          slug
          name
          repositories {
            id
            projectId
            provider
            owner
            name
            prChecks
            canEnablePrChecks
          }
        }
      }
    }
  }
`;

const getPolicyQuery = `
  query getPolicy($slug: String!) {
    getProject(input: { slug: $slug }) {
      id
      policy {
        id
        json
      }
    }
  }
`;

export async function getUser(accessToken: string): Promise<UserData | undefined> {
  return queryApi(getUserQuery, accessToken);
}

export async function getPolicy(slug: string, accessToken: string): Promise<PolicyData | undefined> {
  return queryApi(getPolicyQuery, accessToken, { slug });
}

async function queryApi(query: string, token: string, variables = {}) {
  const apiUrl = globals.remotePolicyUrl;
  const apiEndpointUrl = normalizeUrl(`${apiUrl}/graphql`);

  logger.log('apiEndpointUrl', apiEndpointUrl);

  try {
    const response = await fetch(apiEndpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        query,
        variables,
      })
    });

    logger.log('response', response.status, response.statusText);

    if (!response.ok) {
      raiseError(
        `Connection error. Cannot fetch data from ${apiEndpointUrl}. Error '${response.statusText}' (${response.status}).`
      );
      return undefined;
    }

    return response.json();
  } catch (err) {
    raiseError(
      `Connection error. Cannot fetch data from ${apiEndpointUrl}. Error '${err.message}.`
    );
    return undefined;
  }
}
