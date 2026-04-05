export interface GitHubUser {
    login: string;
    avatar_url: string;
    name: string | null;
}
export interface Repository {
    id: number;
    name: string;
    full_name: string;
    owner: {
        login: string;
        avatar_url: string;
    };
    default_branch: string;
    private: boolean;
}
export interface ProjectAnalysis {
    type: 'app-router' | 'pages-router' | 'hybrid' | 'unknown';
    faviconLocations: string[];
    metadataFile: string | null;
    layoutFile: string | null;
    documentFile: string | null;
    hasExistingFavicon: boolean;
    timing: {
        treeMs: number;
        analysisMs: number;
        totalMs: number;
    };
}
export interface FaviconConfig {
    text: string;
    backgroundColor: string;
    textColor: string;
    fontFamily: string;
    shape: 'circle' | 'square' | 'rounded';
}
export interface GeneratedFavicon {
    svg: string;
    icoBase64: string;
    png32Base64: string;
    png192Base64: string;
    png512Base64: string;
}
export interface TransformResult {
    code: string;
    changed: boolean;
    timing: number;
}
export interface FileChange {
    path: string;
    content: string;
    encoding?: 'utf-8' | 'base64';
    action: 'create' | 'update';
}
export interface PRResult {
    url: string;
    number: number;
    title: string;
    timing: number;
}
export interface TimingMetrics {
    tokenValidation: number;
    repoFetch: number;
    projectAnalysis: number;
    faviconGeneration: number;
    astTransform: number;
    prCreation: number;
    total: number;
}
export interface AppState {
    step: 'token' | 'repo' | 'design' | 'preview' | 'creating' | 'done';
    token: string | null;
    user: GitHubUser | null;
    repositories: Repository[];
    selectedRepo: Repository | null;
    analysis: ProjectAnalysis | null;
    faviconConfig: FaviconConfig;
    generatedFavicon: GeneratedFavicon | null;
    fileChanges: FileChange[];
    prResult: PRResult | null;
    timing: Partial<TimingMetrics>;
    error: string | null;
}
export declare const DEFAULT_FAVICON_CONFIG: FaviconConfig;
export interface CLIOptions {
    token?: string;
    repo: string;
    branch?: string;
    image?: string;
    svg?: string;
    text?: string;
    background?: string;
    color?: string;
    shape?: 'circle' | 'square' | 'rounded';
    output?: 'json' | 'text';
    dryRun?: boolean;
    verbose?: boolean;
}
export interface CLIResult {
    success: boolean;
    timing: {
        total: number;
        steps: Record<string, number>;
    };
    analysis?: ProjectAnalysis;
    changes?: FileChange[];
    pr?: PRResult;
    error?: string;
}
export interface ImageInput {
    type: 'svg' | 'png' | 'ico' | 'generated';
    source: 'file' | 'url' | 'text';
    data: string;
    originalPath?: string;
}
