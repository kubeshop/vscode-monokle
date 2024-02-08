import express = require('express');
import { Request, Response, Application } from 'express';
import { mockServer } from '@graphql-tools/mock';
import { Server } from 'http';

const schema = `
  type Query {
    me: UserModel!
    getProject(input: GetProjectInput!): ProjectModel!
    getSuppressions(input: GetSuppressionsInput!): [SuppressionsModel!]!
  }

  type UserModel {
    id: Int!
    email: String!
    projects: [ProjectMemberModel!]!
  }

  type ProjectMemberModel {
    project: ProjectModel!
  }

  type ProjectModel {
    id: Int!
    slug: String!
    name: String!
    repositories: [ProjectRepositoryModel!]!
    repository(input: GetRepositoryInput!): ProjectRepositoryModel
    permissions: ProjectPermissionsModel
    policy: ProjectPolicyModel
  }

  type ProjectRepositoryModel {
    id: String!
    name: String!
    owner: String!
    prChecks: Boolean
    projectId: Int!
    provider: RepositoryProviderEnum!
    canEnablePrChecks: Boolean
  }

  type ProjectPermissionsModel {
    project: PermissionsModel1!
    members: PermissionsModel1!
    repositories: PermissionsModel2
  }

  type SuppressionsModel {
    isSnapshot: Boolean!,
    data: [SuppressionModel!]!
  }

  type SuppressionModel {
    id: String!
    fingerprint: String!
    description: String!
    location: String!
    status: String!
    justification: String!
    expiresAt: String!
    updatedAt: String!
    createdAt: String!
    isUnderReview: Boolean!
    isAccepted: Boolean!
    isRejected: Boolean!
    isExpired: Boolean!
    isDeleted: Boolean!
    repositoryId: String!
  }

  type PermissionsModel1 {
    view: Boolean!
    update: Boolean!
    delete: Boolean!
  }

  type PermissionsModel2 {
    read: Boolean!
    write: Boolean!
  }

  enum RepositoryProviderEnum {
    BITBUCKET
    GITHUB
    GITLAB
  }

  scalar JSON

  scalar DateISO

  scalar ID

  type ProjectPolicyModel {
    id: String!
    json: JSON!
    updatedAt: DateISO
  }

  input GetProjectInput {
    id: Int
    slug: String
  }

  input GetRepositoryInput {
    owner: String!
    name: String!
    provider: String!
  }

  input GetSuppressionsInput {
    repositoryId: ID!,
    from: String
  }
`;

export const DEFAULT_POLICY = {
  plugins: {
    'open-policy-agent': true
  }
};

const mockData = {
  ProjectRepositoryModel: () => ({
    provider: 'GITHUB',
    owner: 'kubeshop',
    name: 'monokle-demo',
  }),
  JSON: () => (DEFAULT_POLICY),
  DateISO: () => (new Date()).toISOString(),
  ID: () => 100
};

export function startMockServer(host = '0.0.0.0', port = 5000): Promise<Server> {
  const HOST = process.env.MOCK_HOST ?? host;
  const PORT = process.env.MOCK_PORT ? parseInt(process.env.MOCK_PORT, 10) : port;

  const apiMock: Application = express();
  const graphqlMock = mockServer(schema, mockData, false);

  apiMock.use(express.json());

  apiMock.get('/health', (_req: Request, res: Response) => {
    res.send('OK');
  });

  apiMock.post('/graphql', async (req: Request, res: Response) => {
    const token = req.get('Authorization');
    const body = req.body;

    console.log('API-MOCK', token, body);

    const response = await graphqlMock.query(body.query, body.variables);

    console.log('API-MOCK', JSON.stringify(response));

    res.send(response);
  });

  return new Promise((resolve) => {
    const server = apiMock.listen(PORT, HOST, () => {
      console.log(`API-MOCK: Test server running on ${HOST}:${PORT}.`);

      server.on('close', () => {
        console.log('API-MOCK: Test server closed.');
      });

      resolve(server);
    });
  });
}
