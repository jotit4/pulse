import { useState } from "react";
import { useSearch } from "@/hooks/useSearch";
import { UserCard } from "@/components/user/UserCard";
import { Spinner } from "@/components/ui/Spinner";

/** Página de búsqueda de usuarios. El debounce de 350 ms vive en useSearch. */
export function SearchPage() {
  const [inputValue, setInputValue] = useState("");

  const { data, isLoading } = useSearch(inputValue);

  return (
    <div>
      <div className="px-4 py-4 border-b border-gray-100">
        {/* Fix #4: label asociado al input para accesibilidad */}
        <label htmlFor="buscar-usuarios" className="sr-only">
          Buscar usuarios
        </label>
        <input
          id="buscar-usuarios"
          type="search"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Buscar usuarios..."
          className="w-full rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm outline-none focus:border-brand focus:bg-white transition-colors"
        />
      </div>

      <div>
        {/* Mensaje de ayuda cuando la búsqueda es muy corta */}
        {inputValue.trim().length < 2 && (
          <p className="px-4 py-8 text-center text-sm text-gray-500">
            Escribí al menos 2 caracteres para buscar.
          </p>
        )}

        {/* Spinner mientras busca */}
        {inputValue.trim().length >= 2 && isLoading && (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        )}

        {/* Sin resultados */}
        {inputValue.trim().length >= 2 && !isLoading && data?.users.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-gray-500">
            Sin resultados para {inputValue}
          </p>
        )}

        {/* Lista de usuarios encontrados */}
        {data?.users.map((user) => (
          <UserCard key={user.id} user={user} />
        ))}
      </div>
    </div>
  );
}
