import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore'
import type { Army } from './army'
import { auth, db } from './firebase'

/**
 * Stockage des listes : collection `armies` de Firestore si Firebase est configuré
 * (une liste par document, rattachée au compte), sinon localStorage (mode local, sans compte).
 */
const LOCAL_KEY = 'bnw.armies'

function readLocal(): Army[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '[]') as Army[]
  } catch {
    return []
  }
}

function writeLocal(armies: Army[]) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(armies))
}

interface ArmyDoc {
  uid: string
  name: string
  factionId: string
  updatedAt: string
  /** Liste rangée en JSON (Firestore refuse les valeurs `undefined`). */
  data: string
}

const uid = () => {
  const u = auth?.currentUser
  if (!u) throw new Error('Vous devez être connecté pour accéder à vos listes.')
  return u.uid
}

const byDate = (a: Army, b: Army) => b.updatedAt.localeCompare(a.updatedAt)

export async function listArmies(): Promise<Army[]> {
  if (!db) return readLocal().sort(byDate)
  const snap = await getDocs(query(collection(db, 'armies'), where('uid', '==', uid())))
  return snap.docs.map((d) => ({ ...(JSON.parse((d.data() as ArmyDoc).data) as Army), id: d.id })).sort(byDate)
}

export async function getArmy(id: string): Promise<Army | null> {
  if (!db) return readLocal().find((a) => a.id === id) ?? null
  try {
    const snap = await getDoc(doc(db, 'armies', id))
    return snap.exists() ? { ...(JSON.parse((snap.data() as ArmyDoc).data) as Army), id: snap.id } : null
  } catch (err) {
    if ((err as { code?: string }).code === 'permission-denied') return null
    throw err
  }
}

export async function saveArmy(army: Army): Promise<Army> {
  const saved = { ...army, updatedAt: new Date().toISOString() }
  if (!db) {
    writeLocal([saved, ...readLocal().filter((a) => a.id !== army.id)])
    return saved
  }
  const data: ArmyDoc = { uid: uid(), name: saved.name, factionId: saved.factionId, updatedAt: saved.updatedAt, data: JSON.stringify(saved) }
  await setDoc(doc(db, 'armies', saved.id), data)
  return saved
}

export async function deleteArmy(id: string): Promise<void> {
  if (!db) {
    writeLocal(readLocal().filter((a) => a.id !== id))
    return
  }
  await deleteDoc(doc(db, 'armies', id))
}

/** Listes restées dans ce navigateur (créées en mode local, avant la connexion). */
export const localArmies = (): Army[] => (db ? readLocal() : [])

/** Copie les listes du navigateur dans le compte, puis les retire du navigateur. */
export async function moveLocalArmiesToAccount(): Promise<number> {
  const armies = readLocal()
  for (const a of armies) await saveArmy(a)
  localStorage.removeItem(LOCAL_KEY)
  return armies.length
}
