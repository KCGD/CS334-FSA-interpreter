export function replace_math_chars(string:string): string {
    return string 
        .replace(/\\epsilon/g, 'ε')
        .replace(/\\phi/g, 'ϕ')
}