; --------------------------
;     Generated assembly    
; --------------------------

%include	'functions.asm'
%include	'macros.asm'

section .text
global  _start

_start:
	xor		eax, eax
	xor		ebx, ebx
	xor		ecx, ecx
	xor		edx, edx
	mov		ebp, esp	; save program base pointer
	push	ebp

	push	12
	; statement_debug (int)
	mov		eax, [ebp - 2 * 4]	; (z)
	call	iprintLF

	; statement_debug (int)
	mov		eax, [ebp - 2 * 4]	; (z)
	push	eax	; arg 0
	; op call
	call	fn_debug_x1
	add		esp, 1 * 4	; removes arguments from stack
	call	iprintLF

	mov		ebx, 0	; exit code
	call	_exit

; debug_xy(x: int): int
fn_debug_xy2:
	push	ebp
	mov		ebp, esp	; saves the function base pointer

	; statement_debug (int)
	mov		eax, [ebp + 2 * 4]	; (x)
	call	iprintLF

	; statement_debug (int)
	mov		eax, [ebp + 3 * 4]	; (z)
	call	iprintLF

	; op add
	mov		eax, [ebp + 2 * 4]	; (x)
	mov		ebx, eax
	mov		eax, [ebp + 1 * 4]	; (y)
	add		eax, ebx
	add		esp, 0 * 4
	pop		ebp
	ret

; debug_x(x: int): int
fn_debug_x1:
	push	ebp
	mov		ebp, esp	; saves the function base pointer

	mov		eax, ebp
	call 	

	push	10
	; statement_debug (int)
	mov		eax, [ebp - 2 * 4]	; (y)
	call	iprintLF

	; statement_debug (int)
	mov		eax, [ebp + 2 * 4]	; (x)
	call	iprintLF

	; statement_debug (int)
	mov		eax, [ebp + 2 * 4]	; (z)
	call	iprintLF

	; statement_debug (str)
	mov		eax, str0
	call	sprintLF
	mov		eax, str1
	call	sprint
	mov		eax, [ebp + -6 * 4]
	call	iprintLF
	mov		eax, str2
	call	sprint
	mov		eax, [ebp + -5 * 4]
	call	iprintLF
	mov		eax, str3
	call	sprint
	mov		eax, [ebp + -4 * 4]
	call	iprintLF
	mov		eax, str4
	call	sprint
	mov		eax, [ebp + -3 * 4]
	call	iprintLF
	mov		eax, str5
	call	sprint
	mov		eax, [ebp + -2 * 4]
	call	iprintLF
	mov		eax, str6
	call	sprint
	mov		eax, [ebp + -1 * 4]
	call	iprintLF
	mov		eax, str7
	call	sprint
	mov		eax, [ebp + 0 * 4]
	call	iprintLF
	mov		eax, str8
	call	sprint
	mov		eax, [ebp + 1 * 4]
	call	iprintLF
	mov		eax, str9
	call	sprint
	mov		eax, [ebp + 2 * 4]
	call	iprintLF
	mov		eax, str10
	call	sprint
	mov		eax, [ebp + 3 * 4]
	call	iprintLF
	mov		eax, str11
	call	sprint
	mov		eax, [ebp + 4 * 4]
	call	iprintLF
	mov		eax, str12
	call	sprint
	mov		eax, [ebp + 5 * 4]
	call	iprintLF
	mov		eax, str13
	call	sprint
	mov		eax, [ebp + 6 * 4]
	call	iprintLF
	mov		eax, str14
	call	sprintLF

	mov		eax, [ebp + 2 * 4]	; (x)
	push	eax	; arg 0
	; op call
	call	fn_debug_xy2
	add		esp, 1 * 4	; removes arguments from stack
	mov		eax, [ebp + 2 * 4]	; (x)
	add		esp, 1 * 4
	pop		ebp
	ret

section .data
str0: db '>>> begin dump', 0h
str1: db 'value at [ebp + -6 * 4] : ', 0h
str2: db 'value at [ebp + -5 * 4] : ', 0h
str3: db 'value at [ebp + -4 * 4] : ', 0h
str4: db 'value at [ebp + -3 * 4] : ', 0h
str5: db 'value at [ebp + -2 * 4] : ', 0h
str6: db 'value at [ebp + -1 * 4] : ', 0h
str7: db 'value at [ebp + 0 * 4] : ', 0h
str8: db 'value at [ebp + 1 * 4] : ', 0h
str9: db 'value at [ebp + 2 * 4] : ', 0h
str10: db 'value at [ebp + 3 * 4] : ', 0h
str11: db 'value at [ebp + 4 * 4] : ', 0h
str12: db 'value at [ebp + 5 * 4] : ', 0h
str13: db 'value at [ebp + 6 * 4] : ', 0h
str14: db '>>> end dump', 0h

section .bss
