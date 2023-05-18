export function deserializeJson(input: string): any | null {
  const jsonString = input.match(/{[^}]*}/)?.[0];
  if (!jsonString) {
    return null;
  }

  const deserializedObject = JSON.parse(jsonString);
  return deserializedObject;
}

export function deserializeFullJson(input: string): any | null {
  const jsonString = input.match(/{[^}]*}/)?.[0];
  if (!jsonString) {
    return null;
  }

  const deserializedObject = JSON.parse(input);
  return deserializedObject;
}
