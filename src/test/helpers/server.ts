import express = require('express');
import { Request, Response, Application } from 'express';
import { mockServer } from '@graphql-tools/mock';
import { Server } from 'http';

const schema = `
  scalar JSON
  scalar DateISO
  scalar ID
  scalar TRUE
  scalar FALSE

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
    read: TRUE!
    write: FALSE!
  }

  enum RepositoryProviderEnum {
    BITBUCKET
    GITHUB
    GITLAB
  }

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
    'pod-security-standards': false,
    'yaml-syntax': false,
    'resource-links': false,
    'kubernetes-schema': false,
    'practices': true,
  },
  rules: {
    'practices/no-mounted-docker-sock': false,
    'practices/no-writable-fs': false,
    'practices/drop-capabilities': false,
    'practices/no-low-group-id': false,
    'practices/no-automount-service-account-token': false,
    'practices/no-pod-create': false,
    'practices/no-pod-execute': false,
    'practices/no-no-root-group': 'err',
    'practices/no-sys-admin': false,
    'practices/cpu-limit': false,
    'practices/no-latest-image': false,
    'practices/cpu-request': false,
    'practices/memory-request': false,
    'practices/memory-limit': false,
    'practices/no-low-user-id': 'err',
    'practices/no-root-group': false,
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
  ID: () => 100,
  TRUE: () => true,
  FALSE: () => false
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
