import { workspace } from 'vscode';
import normalizeUrl from 'normalize-url';
import fetch from 'node-fetch';
import { SETTINGS } from '../constants';
import { raiseError } from './errors';
import logger from './logger';

const API_TOKEN = process.env.MONOKLE_VSC_API_TOKEN;

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

export async function getUser(): Promise<UserData | undefined> {
  return queryApi(getUserQuery, API_TOKEN);
}

export async function getPolicy(slug: string): Promise<PolicyData | undefined> {
  return queryApi(getPolicyQuery, API_TOKEN, { slug });
}

async function queryApi(query: string, token: string, variables = {}) {
  const apiUrl = workspace.getConfiguration(SETTINGS.NAMESPACE).get<boolean>(SETTINGS.REMOTE_POLICY_URL);

  if (!apiUrl) {
    // Log error as this should not happen, we only should use this helper when remote policy is enabled.
    logger.error('Trying to use \'queryApi\' despite remote policy not being configured.');
    return undefined;
  }

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
