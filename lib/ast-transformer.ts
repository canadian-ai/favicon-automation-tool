import * as recast from "recast";
import { parse as babelParse } from "@babel/parser";
import type { TransformResult } from "./types";

const b = recast.types.builders;
const n = recast.types.namedTypes;

// Custom TypeScript parser for recast using @babel/parser
const tsParser = {
  parse(source: string) {
    return babelParse(source, {
      sourceType: "module",
      plugins: ["typescript", "jsx"],
      tokens: true,
    });
  },
};

/**
 * Transforms a Next.js App Router layout.tsx to add favicon metadata
 * Uses recast for precise AST manipulation that preserves formatting
 * 
 * This is FAST: ~10-50ms for typical layout files
 */
export function transformLayoutMetadata(
  sourceCode: string,
  faviconPath: string
): TransformResult {
  const start = performance.now();
  
  try {
    const ast = recast.parse(sourceCode, {
      parser: tsParser,
    });
    
    let changed = false;
    let metadataFound = false;
    
    // Walk the AST to find the metadata export
    recast.visit(ast, {
      visitExportNamedDeclaration(path) {
        const node = path.node;
        
        // Look for: export const metadata = { ... }
        if (
          node.declaration &&
          n.VariableDeclaration.check(node.declaration)
        ) {
          for (const declarator of node.declaration.declarations) {
            if (
              n.VariableDeclarator.check(declarator) &&
              n.Identifier.check(declarator.id) &&
              declarator.id.name === "metadata" &&
              declarator.init &&
              n.ObjectExpression.check(declarator.init)
            ) {
              metadataFound = true;
              changed = updateMetadataObject(declarator.init, faviconPath);
              return false; // Stop traversal
            }
            
            // Handle: export const metadata: Metadata = { ... }
            // With satisfies or type assertion
            if (
              n.VariableDeclarator.check(declarator) &&
              n.Identifier.check(declarator.id) &&
              declarator.id.name === "metadata" &&
              declarator.init
            ) {
              // Handle TSAsExpression or TSSatisfiesExpression
              let targetObject = declarator.init;
              
              if (n.TSAsExpression && n.TSAsExpression.check(targetObject)) {
                targetObject = targetObject.expression;
              }
              if (n.TSSatisfiesExpression && n.TSSatisfiesExpression.check(targetObject)) {
                targetObject = targetObject.expression;
              }
              
              if (n.ObjectExpression.check(targetObject)) {
                metadataFound = true;
                changed = updateMetadataObject(targetObject, faviconPath);
                return false;
              }
            }
          }
        }
        
        this.traverse(path);
      },
    });
    
    // If no metadata export found, we could add one, but for now we'll
    // just report that no changes were made
    if (!metadataFound) {
      return {
        code: sourceCode,
        changed: false,
        timing: performance.now() - start,
      };
    }
    
    const result = recast.print(ast);
    
    return {
      code: result.code,
      changed,
      timing: performance.now() - start,
    };
  } catch (error) {
    // If parsing fails, return original code unchanged
    console.error("AST parsing failed:", error);
    return {
      code: sourceCode,
      changed: false,
      timing: performance.now() - start,
    };
  }
}

/**
 * Updates the metadata object to include/update the icons property
 */
function updateMetadataObject(
  obj: recast.types.namedTypes.ObjectExpression,
  faviconPath: string
): boolean {
  // Find existing icons property
  let iconsProperty: recast.types.namedTypes.Property | null = null;
  let iconsIndex = -1;
  
  for (let i = 0; i < obj.properties.length; i++) {
    const prop = obj.properties[i];
    if (
      n.Property.check(prop) &&
      n.Identifier.check(prop.key) &&
      prop.key.name === "icons"
    ) {
      iconsProperty = prop;
      iconsIndex = i;
      break;
    }
  }
  
  // Create the new icons value
  const iconsValue = b.objectExpression([
    b.property(
      "init",
      b.identifier("icon"),
      b.literal(faviconPath)
    ),
  ]);
  
  if (iconsProperty) {
    // Update existing icons property
    iconsProperty.value = iconsValue;
  } else {
    // Add new icons property
    const newProp = b.property("init", b.identifier("icons"), iconsValue);
    obj.properties.push(newProp);
  }
  
  return true;
}

/**
 * Transforms a Next.js Pages Router _document.tsx to add favicon link
 * Finds the <Head> component and adds a link element
 */
export function transformDocumentHead(
  sourceCode: string,
  faviconPath: string
): TransformResult {
  const start = performance.now();
  
  try {
    const ast = recast.parse(sourceCode, {
      parser: tsParser,
    });
    
    let changed = false;
    
    recast.visit(ast, {
      visitJSXElement(path) {
        const node = path.node;
        
        // Look for <Head> component
        if (
          n.JSXElement.check(node) &&
          n.JSXIdentifier.check(node.openingElement.name) &&
          node.openingElement.name.name === "Head"
        ) {
          // Check if favicon link already exists
          const hasExistingFavicon = node.children?.some((child) => {
            if (n.JSXElement.check(child)) {
              const opening = child.openingElement;
              if (
                n.JSXIdentifier.check(opening.name) &&
                opening.name.name === "link"
              ) {
                return opening.attributes?.some((attr) => {
                  if (
                    n.JSXAttribute.check(attr) &&
                    n.JSXIdentifier.check(attr.name) &&
                    attr.name.name === "rel"
                  ) {
                    const value = attr.value;
                    if (n.StringLiteral.check(value) || n.Literal.check(value)) {
                      return value.value === "icon" || value.value === "shortcut icon";
                    }
                  }
                  return false;
                });
              }
            }
            return false;
          });
          
          if (!hasExistingFavicon) {
            // Create favicon link element
            const faviconLink = b.jsxElement(
              b.jsxOpeningElement(
                b.jsxIdentifier("link"),
                [
                  b.jsxAttribute(b.jsxIdentifier("rel"), b.literal("icon")),
                  b.jsxAttribute(b.jsxIdentifier("href"), b.literal(faviconPath)),
                  b.jsxAttribute(b.jsxIdentifier("type"), b.literal("image/svg+xml")),
                ],
                true // self-closing
              ),
              null, // no closing element for self-closing
              []
            );
            
            // Add to Head children
            if (!node.children) {
              node.children = [];
            }
            node.children.push(b.jsxText("\n        "));
            node.children.push(faviconLink);
            changed = true;
          }
          
          return false; // Stop traversal
        }
        
        this.traverse(path);
      },
    });
    
    const result = recast.print(ast);
    
    return {
      code: result.code,
      changed,
      timing: performance.now() - start,
    };
  } catch (error) {
    console.error("AST parsing failed:", error);
    return {
      code: sourceCode,
      changed: false,
      timing: performance.now() - start,
    };
  }
}

/**
 * Determines if the code needs transformation based on project type
 * Returns the appropriate transformer function
 */
export function getTransformer(
  projectType: "app-router" | "pages-router" | "hybrid" | "unknown"
): {
  transform: (code: string, faviconPath: string) => TransformResult;
  fileType: "layout" | "document";
} | null {
  switch (projectType) {
    case "app-router":
    case "hybrid":
      return {
        transform: transformLayoutMetadata,
        fileType: "layout",
      };
    case "pages-router":
      return {
        transform: transformDocumentHead,
        fileType: "document",
      };
    default:
      return null;
  }
}

/**
 * Validates that a transformation was successful
 * Quick syntax check using recast
 */
export function validateTransformation(code: string): boolean {
  try {
    recast.parse(code, { parser: tsParser });
    return true;
  } catch {
    return false;
  }
}
