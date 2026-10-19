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
 * Returns true if an object member is keyed `icons`.
 * @babel/parser emits `ObjectProperty`/`ObjectMethod` (not ESTree `Property`),
 * and keys may be identifiers (`icons`) or string literals (`"icons"`).
 */
function isIconsMember(prop: unknown): boolean {
  if (
    !n.Property.check(prop) &&
    !n.ObjectProperty.check(prop) &&
    !n.ObjectMethod.check(prop)
  ) {
    return false;
  }
  const node = prop as { key: unknown; computed?: boolean };
  const key = node.key;
  if (n.Identifier.check(key)) return !node.computed && key.name === "icons";
  if (n.StringLiteral.check(key) || n.Literal.check(key)) {
    return (key as { value: unknown }).value === "icons";
  }
  return false;
}

/**
 * Sets metadata.icons to `{ icon: faviconPath }`, overriding any existing
 * value (object, array, or string) and removing duplicate `icons` keys
 * left behind by earlier runs.
 */
function updateMetadataObject(
  obj: recast.types.namedTypes.ObjectExpression,
  faviconPath: string
): boolean {
  const before = recast.print(obj).code;

  const iconsValue = b.objectExpression([
    b.objectProperty(b.identifier("icon"), b.stringLiteral(faviconPath)),
  ]);
  const iconsProp = b.objectProperty(b.identifier("icons"), iconsValue);

  const firstIndex = obj.properties.findIndex(isIconsMember);

  if (firstIndex === -1) {
    obj.properties.push(iconsProp);
  } else {
    obj.properties = obj.properties.filter(
      (prop, i) => i === firstIndex || !isIconsMember(prop)
    );
    obj.properties[firstIndex] = iconsProp;
  }

  return recast.print(obj).code !== before;
}

function isFaviconLink(child: unknown): boolean {
  if (!n.JSXElement.check(child)) return false;
  const opening = child.openingElement;
  if (!n.JSXIdentifier.check(opening.name) || opening.name.name !== "link") {
    return false;
  }
  return (opening.attributes ?? []).some((attr) => {
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

function setJsxAttribute(
  opening: recast.types.namedTypes.JSXOpeningElement,
  name: string,
  value: string
): void {
  const attributes = opening.attributes ?? [];
  const newAttr = b.jsxAttribute(b.jsxIdentifier(name), b.stringLiteral(value));
  const index = attributes.findIndex(
    (attr) =>
      n.JSXAttribute.check(attr) &&
      n.JSXIdentifier.check(attr.name) &&
      attr.name.name === name
  );
  if (index === -1) {
    attributes.push(newAttr);
  } else {
    attributes[index] = newAttr;
  }
  opening.attributes = attributes;
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
          const children = node.children ?? [];
          const before = recast.print(node).code;
          const firstIconIndex = children.findIndex(isFaviconLink);

          if (firstIconIndex !== -1) {
            // Override the first existing favicon link and drop any duplicates
            const first = children[firstIconIndex] as recast.types.namedTypes.JSXElement;
            setJsxAttribute(first.openingElement, "href", faviconPath);
            setJsxAttribute(first.openingElement, "type", "image/svg+xml");
            node.children = children.filter(
              (child, i) => i === firstIconIndex || !isFaviconLink(child)
            );
            changed = recast.print(node).code !== before;
          } else {
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
