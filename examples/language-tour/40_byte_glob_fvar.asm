; ZAX lowered .asm trace
; range: $0100..$2008 (end exclusive)

; func byte_glob_fvar begin
byte_glob_fvar:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
ex DE, HL                      ; 010B: EB
ld E, (IX + $0004)             ; 010C: DD 5E 04
ld D, (IX + $0005)             ; 010F: DD 56 05
ex DE, HL                      ; 0112: EB
push HL                        ; 0113: E5
pop HL                         ; 0114: E1
push HL                        ; 0115: E5
ld HL, glob_bytes              ; 0116: 21 00 00
pop DE                         ; 0119: D1
add HL, DE                     ; 011A: 19
push HL                        ; 011B: E5
pop HL                         ; 011C: E1
ld A, (hl)                     ; 011D: 7E
push AF                        ; 011E: F5
ex DE, HL                      ; 011F: EB
ld E, (IX + $0004)             ; 0120: DD 5E 04
ld D, (IX + $0005)             ; 0123: DD 56 05
ex DE, HL                      ; 0126: EB
push HL                        ; 0127: E5
pop HL                         ; 0128: E1
push HL                        ; 0129: E5
ld HL, glob_bytes              ; 012A: 21 00 00
pop DE                         ; 012D: D1
add HL, DE                     ; 012E: 19
push HL                        ; 012F: E5
pop HL                         ; 0130: E1
ld (hl), A                     ; 0131: 77
pop AF                         ; 0132: F1
ld H, $0000                    ; 0133: 26 00
ld L, A                        ; 0135: 6F
__zax_epilogue_0:
pop DE                         ; 0136: D1
pop BC                         ; 0137: C1
pop AF                         ; 0138: F1
ld SP, IX                      ; 0139: DD F9
pop IX                         ; 013B: DD E1
ret                            ; 013D: C9
; func byte_glob_fvar end
; func main begin
main:
push IX                        ; 013E: DD E5
ld IX, $0000                   ; 0140: DD 21 00 00
add IX, SP                     ; 0144: DD 39
push AF                        ; 0146: F5
push BC                        ; 0147: C5
push DE                        ; 0148: D5
push HL                        ; 0149: E5
ld HL, $0002                   ; 014A: 21 02 00
push HL                        ; 014D: E5
call byte_glob_fvar            ; 014E: CD 00 00
inc SP                         ; 0151: 33
inc SP                         ; 0152: 33
__zax_epilogue_1:
pop HL                         ; 0153: E1
pop DE                         ; 0154: D1
pop BC                         ; 0155: C1
pop AF                         ; 0156: F1
ld SP, IX                      ; 0157: DD F9
pop IX                         ; 0159: DD E1
ret                            ; 015B: C9
; func main end

; symbols:
; label byte_glob_fvar = $0100
; label __zax_epilogue_0 = $0136
; label main = $013E
; label __zax_epilogue_1 = $0153
; data glob_bytes = $2000
