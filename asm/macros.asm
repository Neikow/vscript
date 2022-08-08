%macro dump 0
	mov		eax, 10000000
	call	iprintLF
	mov		eax, ebp
	call	iprintLF
	mov		eax, 10000000
	call	iprintLF
	
	mov		eax, [ebp - 4 * 4]
	call	iprintLF
	mov		eax, [ebp - 3 * 4]
	call	iprintLF
	mov		eax, [ebp - 2 * 4]
	call	iprintLF
	mov		eax, [ebp - 1 * 4]
	call	iprintLF
	mov		eax, [ebp - 0 * 4]
	call	iprintLF
	mov		eax, [ebp + 1 * 4]
	call	iprintLF
	mov		eax, [ebp + 2 * 4]
	call	iprintLF
	mov		eax, [ebp + 3 * 4]
	call	iprintLF
	mov		eax, [ebp + 4 * 4]
	call	iprintLF

%endmacro