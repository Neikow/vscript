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
	; gso: 1 : lso: 1
	push	ebp

	; gso: 2 : lso: 2
	push	10
	; gso: 3 : lso: 3
	push	3
	; gso: 4 : lso: 4
	push	100
	; gso: 5 : lso: 5
	push	1000
	; statement_debug (int)
	; gso: 5 : lso: 6
	push	ebp
	; thousand
	mov		eax, [ebp - 5 * 4]
	; gso: 6 : lso: 7
	push	eax	; arg 0
	mov		[ebp - 5 * 4], eax
	; op call
	; gso: 7 : lso: 8
	push	1	; arguments count
	call	fn_timesThreeAddTen1
	add		esp, 2 * 4	; removes arguments from stack
	; gso: 6 : lso: 7
	pop		ebp
	; mov		eax, eax
	call	iprintLF

	mov		ebx, 0	; exit code
	call	_exit

; timesThreeAddTen(x: int): int
fn_timesThreeAddTen1:
	mov		ebp, esp	; saves the function base pointer

	; op add
	; x arg
	mov		eax, [ebp + 2 * 4]
	mov		ebx, eax
	; ten
	mov		eax, [ebp + 7 * 4]
	; mov		eax, eax
	add		eax, ebx
	; gso: 6 : lso: 1
	push	eax
	; sum
	mov		eax, [ebp - 1 * 4]
	mov		[ebp - 1 * 4], eax
	mov		esp, ebp
	ret

section .data

section .bss
