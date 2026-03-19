; ZAX lowered .asm trace
; range: $0100..$805D (end exclusive)

; func sum_from begin
sum_from:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
ld HL, $0000                   ; 0108: 21 00 00
push HL                        ; 010B: E5
ld HL, $0000                   ; 010C: 21 00 00
push HL                        ; 010F: E5
push AF                        ; 0110: F5
push BC                        ; 0111: C5
push DE                        ; 0112: D5
ld A, (ix+$04)                 ; 0113: DD 7E 04
cp ItemCount                   ; 0116: FE 06
jp nz, __zax_if_else_1         ; 0118: C2 00 00
ld HL, $0000                   ; 011B: 21 00 00
jp __zax_epilogue_0            ; 011E: C3 00 00
__zax_if_else_1:
ex DE, HL                      ; 0121: EB
ld E, (IX + $0004)             ; 0122: DD 5E 04
ex DE, HL                      ; 0125: EB
push DE                        ; 0126: D5
push HL                        ; 0127: E5
ld de, numbers                 ; 0128: 11 00 00
ld H, $0000                    ; 012B: 26 00
ld L, L                        ; 012D: 6D
add HL, DE                     ; 012E: 19
ld A, (HL)                     ; 012F: 7E
pop HL                         ; 0130: E1
pop DE                         ; 0131: D1
ld (ix-$04), A                 ; 0132: DD 77 FC
push AF                        ; 0135: F5
ld A, (ix+$04)                 ; 0136: DD 7E 04
ld (ix-$02), A                 ; 0139: DD 77 FE
pop AF                         ; 013C: F1
push DE                        ; 013D: D5
ld E, (IX - $0002)             ; 013E: DD 5E FE
inc E                          ; 0141: 1C
ld (IX - $0002), E             ; 0142: DD 73 FE
pop DE                         ; 0145: D1
ld e, (ix-$02)                 ; 0146: DD 5E FE
ld H, $0000                    ; 0149: 26 00
ld L, E                        ; 014B: 6B
push HL                        ; 014C: E5
call sum_from                  ; 014D: CD 00 00
inc SP                         ; 0150: 33
inc SP                         ; 0151: 33
ld A, (ix-$04)                 ; 0152: DD 7E FC
ld E, A                        ; 0155: 5F
ld D, $0000                    ; 0156: 16 00
add HL, DE                     ; 0158: 19
__zax_epilogue_0:
pop DE                         ; 0159: D1
pop BC                         ; 015A: C1
pop AF                         ; 015B: F1
ld SP, IX                      ; 015C: DD F9
pop IX                         ; 015E: DD E1
ret                            ; 0160: C9
; func main begin
; func sum_from end
main:
push IX                        ; 0161: DD E5
ld IX, $0000                   ; 0163: DD 21 00 00
add IX, SP                     ; 0167: DD 39
push AF                        ; 0169: F5
push BC                        ; 016A: C5
push DE                        ; 016B: D5
push HL                        ; 016C: E5
ld HL, $0000                   ; 016D: 21 00 00
push HL                        ; 0170: E5
call sum_from                  ; 0171: CD 00 00
inc SP                         ; 0174: 33
inc SP                         ; 0175: 33
__zax_epilogue_3:
pop HL                         ; 0176: E1
pop DE                         ; 0177: D1
pop BC                         ; 0178: C1
pop AF                         ; 0179: F1
ld SP, IX                      ; 017A: DD F9
pop IX                         ; 017C: DD E1
ret                            ; 017E: C9
; func main end

; symbols:
; label sum_from = $0100
; label __zax_if_else_1 = $0121
; label __zax_epilogue_0 = $0159
; label main = $0161
; label __zax_epilogue_3 = $0176
; data numbers = $8000
; label __zax_startup = $8006
; constant ItemCount = $0006 (6)
