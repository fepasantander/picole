/**
 * REGRA DE OURO: Ordenação numérica rígida.
 * Em 100% das telas, itens são agrupados e ordenados por
 * categoria_ordem ASC e sabor_ordem ASC. Nunca alfabeticamente.
 */

export interface OrderedItemLike {
  categoria_ordem: number
  categoria_nome: string
  sabor_ordem: number
  sabor_nome: string
}

export interface GroupedCategory<T extends OrderedItemLike> {
  categoria_ordem: number
  categoria_nome: string
  items: T[]
}

export function sortNumericItems<T extends OrderedItemLike>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const catDiff = Number(a.categoria_ordem) - Number(b.categoria_ordem)
    if (catDiff !== 0) return catDiff
    return Number(a.sabor_ordem) - Number(b.sabor_ordem)
  })
}

export function groupNumericItems<T extends OrderedItemLike>(items: T[]): GroupedCategory<T>[] {
  const sorted = sortNumericItems(items)
  const map = new Map<string, GroupedCategory<T>>()

  for (const item of sorted) {
    const key = `${item.categoria_ordem}::${item.categoria_nome}`
    let group = map.get(key)
    if (!group) {
      group = {
        categoria_ordem: Number(item.categoria_ordem),
        categoria_nome: item.categoria_nome,
        items: [],
      }
      map.set(key, group)
    }
    group.items.push(item)
  }

  return Array.from(map.values()).sort((a, b) => a.categoria_ordem - b.categoria_ordem)
}

export function formatCategoryTitle(ordem: number, nome: string): string {
  return `${ordem}. ${nome}`
}

export function formatFlavorLabel(catOrdem: number, saborOrdem: number, nome: string): string {
  return `${catOrdem}.${saborOrdem} ${nome}`
}
