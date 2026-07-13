import { TFile } from "obsidian";

export enum ErrorCode {
  TextContentEncodingRequired = 40010,
  ContentTypeSpecificationRequired = 40011,
  InvalidContentType = 40012,
  InvalidContentForContentType = 40015,
  MissingDestinationHeader = 40020,
  PathTraversalNotAllowed = 40021,
  InvalidDestinationHeader = 40022,
  MissingTargetTypeHeader = 40053,
  InvalidTargetTypeHeader = 40054,
  MissingTargetHeader = 40055,
  InvalidTargetScopeHeader = 40059,
  MissingOperation = 40056,
  InvalidOperation = 40057,
  InvalidTargetHeader = 40058,
  PeriodIsNotEnabled = 40060,
  InvalidFilterQuery = 40070,
  PatchFailed = 40080,
  InvalidSearch = 40090,
  ApiKeyAuthorizationRequired = 40101,
  PeriodDoesNotExist = 40460,
  PeriodicNoteDoesNotExist = 40461,
  RequestMethodValidOnlyForFiles = 40510,
  DestinationAlreadyExists = 40920,
  ConflictingTargetSpecification = 42200,
  ErrorPreparingSimpleSearch = 50010,
  FileOperationFailed = 50020,
}

export interface LocalRestApiSettings {
  apiKey?: string;
  crypto?: {
    cert: string;
    privateKey: string;
    publicKey: string;
  };
  port: number;
  insecurePort: number;
  enableInsecureServer: boolean;
  enableSecureServer?: boolean;

  authorizationHeaderName?: string;
  bindingHost?: string;
  subjectAltNames?: string;
  enableVerboseLogging?: boolean;
  /** Durable namespace when tools omit `project`. */
  defaultProject?: string;
}

declare module "obsidian" {
  interface App {
    setting: {
      containerEl: HTMLElement;
      openTabById(id: string): void;
      pluginTabs: Array<{
        id: string;
        name: string;
        plugin: {
          [key: string]: PluginManifest;
        };
        instance?: {
          description: string;
          id: string;
          name: string;
        };
      }>;
      activeTab: SettingTab;
      open(): void;
    };
    commands: {
      executeCommandById(id: string): void;
      commands: {
        [key: string]: Command;
      };
    };
    plugins: {
      plugins: {
        [key: string]: PluginManifest;
      };
    };
    internalPlugins: {
      plugins: {
        [key: string]: {
          instance: {
            description: string;
            id: string;
            name: string;
          };
          enabled: boolean;
        };
        workspaces: {
          instance: {
            description: string;
            id: string;
            name: string;
            activeWorkspace: Workspace;
            saveWorkspace(workspace: Workspace): void;
            loadWorkspace(workspace: string): void;
          };
          enabled: boolean;
        };
      };
    };
  }
  interface View {
    file: TFile;
  }
}

export interface ErrorResponseDescriptor {
  statusCode?: number;
  message?: string;
  errorCode?: ErrorCode;
}

export interface CannedResponse {
  message: string;
  errorCode?: number;
}
