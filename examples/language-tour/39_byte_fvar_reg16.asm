; ZAX lowered .asm trace
; range: $0100..$2008 (end exclusive)

; func byte_fvar_reg16 begin
byte_fvar_reg16:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
ex DE, HL                      ; 010B: EB
ld E, (IX + $0006)             ; 010C: DD 5E 06
ld D, (IX + $0007)             ; 010F: DD 56 07
ex DE, HL                      ; 0112: EB
push DE                        ; 0113: D5
push HL                        ; 0114: E5
ld E, (IX + $0004)             ; 0115: DD 5E 04
ld D, (IX + $0005)             ; 0118: DD 56 05
add HL, DE                     ; 011B: 19
ld A, (HL)                     ; 011C: 7E
pop HL                         ; 011D: E1
pop DE                         ; 011E: D1
push DE                        ; 011F: D5
push HL                        ; 0120: E5
ld E, (IX + $0004)             ; 0121: DD 5E 04
ld D, (IX + $0005)             ; 0124: DD 56 05
add HL, DE                     ; 0127: 19
ld (HL), A                     ; 0128: 77
pop HL                         ; 0129: E1
pop DE                         ; 012A: D1
ld H, $0000                    ; 012B: 26 00
ld L, A                        ; 012D: 6F
__zax_epilogue_0:
pop DE                         ; 012E: D1
pop BC                         ; 012F: C1
pop AF                         ; 0130: F1
ld SP, IX                      ; 0131: DD F9
pop IX                         ; 0133: DD E1
ret                            ; 0135: C9
; func byte_fvar_reg16 end
; func main begin
main:
push IX                        ; 0136: DD E5
ld IX, $0000                   ; 0138: DD 21 00 00
add IX, SP                     ; 013C: DD 39
push AF                        ; 013E: F5
push BC                        ; 013F: C5
push DE                        ; 0140: D5
push HL                        ; 0141: E5
ld HL, $0006                   ; 0142: 21 06 00
push HL                        ; 0145: E5
ld HL, glob_bytes              ; 0146: 21 00 00
push HL                        ; 0149: E5
call byte_fvar_reg16           ; 014A: CD 00 00
inc SP                         ; 014D: 33
inc SP                         ; 014E: 33
inc SP                         ; 014F: 33
inc SP                         ; 0150: 33
__zax_epilogue_1:
pop HL                         ; 0151: E1
pop DE                         ; 0152: D1
pop BC                         ; 0153: C1
pop AF                         ; 0154: F1
ld SP, IX                      ; 0155: DD F9
pop IX                         ; 0157: DD E1
ret                            ; 0159: C9
; func main end

; symbols:
; label byte_fvar_reg16 = $0100
; label __zax_epilogue_0 = $012E
; label main = $0136
; label __zax_epilogue_1 = $0151
; data glob_bytes = $2000
